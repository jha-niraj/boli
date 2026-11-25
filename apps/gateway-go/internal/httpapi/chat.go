package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"time"

	"bolihq.com/gateway/internal/apierr"
	"bolihq.com/gateway/internal/boli"
	"bolihq.com/gateway/internal/openai"
)

// maxBody caps the request body. The TS route has no explicit cap (the Worker platform has one); 10 MB is far above
// any 8,192-token conversation.
const maxBody = 10 << 20

func writeJSON(w http.ResponseWriter, status int, v any, headers map[string]string) {
	for k, val := range headers {
		w.Header().Set(k, val)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// usage is our token counts from the OpenAI usage object (route.ts usageOf).
type usage struct{ input, output, reasoning int64 }

// num ports route.ts num(): a finite number above 0, rounded; anything else is 0.
func num(v any) int64 {
	var f float64
	switch x := v.(type) {
	case json.Number:
		parsed, err := x.Float64()
		if err != nil {
			return 0
		}
		f = parsed
	case float64:
		f = x
	default:
		return 0
	}
	if math.IsInf(f, 0) || math.IsNaN(f) || f <= 0 {
		return 0
	}
	return int64(math.Round(f))
}

func usageOf(v any) *usage {
	u, ok := v.(map[string]any)
	if !ok {
		return nil
	}
	out := &usage{input: num(u["prompt_tokens"]), output: num(u["completion_tokens"])}
	if d, ok := u["completion_tokens_details"].(map[string]any); ok {
		out.reasoning = num(d["reasoning_tokens"])
	}
	return out
}

// decodeObject reads a JSON object keeping numbers exact (UseNumber), so ids and counts are not turned into floats.
func decodeObject(r io.Reader) (map[string]any, error) {
	dec := json.NewDecoder(r)
	dec.UseNumber()
	var obj map[string]any
	if err := dec.Decode(&obj); err != nil {
		return nil, err
	}
	if obj == nil {
		return nil, errors.New("not an object")
	}
	return obj, nil
}

// upstreamMessage reads error.message from an upstream error body, if there is one.
func upstreamMessage(r io.Reader) string {
	obj, err := decodeObject(r)
	if err != nil {
		return ""
	}
	if e, ok := obj["error"].(map[string]any); ok {
		if msg, ok := e["message"].(string); ok {
			return msg
		}
	}
	return ""
}

// record saves a call. In dev mode (no Recorder) it is logged instead. A failure to record never fails the reply.
func (s *Server) record(ctx context.Context, c Call) {
	if s.Recorder == nil {
		s.Log.Info("call (dev mode: not charged)", "id", c.ID, "model", c.Model, "stream", c.Stream, "status", c.Status,
			"error_code", string(c.ErrorCode), "input_tokens", c.InputTokens, "output_tokens", c.OutputTokens,
			"reasoning_tokens", c.ReasoningTokens, "latency_ms", c.LatencyMs,
			"cost_micro", costOf(c))
		return
	}
	if err := s.Recorder.Record(ctx, c); err != nil {
		s.Log.Error("could not record a call", "id", c.ID, "err", err)
	}
}

// costOf is what the call would cost; errors cost 0 (credits.ts chargeInference).
func costOf(c Call) int64 {
	m, ok := boli.ModelByID(c.Model)
	if c.Status != "ok" || !ok {
		return 0
	}
	return boli.CostMicro(m, c.InputTokens, c.OutputTokens)
}

func (s *Server) chatCompletions(w http.ResponseWriter, r *http.Request) {
	started := time.Now()

	// TODO(Ch 8): key -> rate limit -> balance, in this order, before the body is read (route.ts POST).

	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxBody))
	if err != nil {
		apierr.Write(w, boli.ErrInvalidRequest, "The request body is not valid JSON. Send a JSON object with `model` and `messages`.", nil)
		return
	}
	req, err := openai.Decode(raw)
	if err != nil {
		var verr *openai.ValidationError
		if errors.As(err, &verr) {
			apierr.Write(w, boli.ErrInvalidRequest, verr.Error(), nil)
			return
		}
		apierr.Write(w, boli.ErrInvalidRequest, "The request body is not valid JSON. Send a JSON object with `model` and `messages`.", nil)
		return
	}

	stream := req.IsStream()
	call := Call{ID: newRequestID(), Model: req.Model, Stream: stream}
	since := func() int64 { return time.Since(started).Milliseconds() }
	recordError := func(code boli.ErrorCode) {
		c := call
		c.Status, c.ErrorCode, c.LatencyMs = "error", code, since()
		s.record(context.WithoutCancel(r.Context()), c)
	}
	unavailable := func() {
		recordError(boli.ErrModelUnavailable)
		apierr.Write(w, boli.ErrModelUnavailable, fmt.Sprintf("%s is not reachable right now. Wait a minute and retry; nothing was charged.", boli.BoliChat.ID), nil)
	}

	// The upstream call is NOT tied to the client: if the caller hangs up, the model still finishes and the call is
	// still charged (route.ts answerStream comment, owner rule). WithoutCancel keeps the values, drops the cancel.
	ctx := context.WithoutCancel(r.Context())
	res, err := s.Upstream.Chat(ctx, req)
	if err != nil {
		s.Log.Error("upstream call failed", "err", err)
		unavailable()
		return
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode > 299 {
		if res.StatusCode == http.StatusBadRequest {
			msg := upstreamMessage(res.Body)
			recordError(boli.ErrInvalidRequest)
			detail := "."
			if msg != "" {
				detail = ": " + msg
			}
			apierr.Write(w, boli.ErrInvalidRequest, fmt.Sprintf("The model could not take this request%s The context is %s tokens (prompt + answer); shorten the messages or lower max_tokens.", detail, thousands(boli.BoliChat.ContextTokens)), nil)
			return
		}
		s.Log.Error("upstream answered", "status", res.StatusCode)
		unavailable()
		return
	}

	if !stream {
		s.answerJSON(w, res.Body, call, started)
		return
	}
	s.answerStream(w, res.Body, call, started)
}

// answerJSON ports route.ts answerJson: rewrite model to the public id, charge, reply with x-boli-request-id.
func (s *Server) answerJSON(w http.ResponseWriter, body io.Reader, call Call, started time.Time) {
	obj, err := decodeObject(body)
	if err != nil {
		call.Status, call.ErrorCode, call.LatencyMs = "error", boli.ErrModelUnavailable, time.Since(started).Milliseconds()
		s.record(context.Background(), call)
		apierr.Write(w, boli.ErrModelUnavailable, "The model sent an answer we could not read. Retry; nothing was charged.", nil)
		return
	}
	obj["model"] = call.Model
	if u := usageOf(obj["usage"]); u != nil {
		call.InputTokens, call.OutputTokens, call.ReasoningTokens = u.input, u.output, u.reasoning
	}
	call.Status, call.LatencyMs = "ok", time.Since(started).Milliseconds()
	s.record(context.Background(), call) // inline, before the reply: money never moves in the background
	writeJSON(w, http.StatusOK, obj, map[string]string{"x-boli-request-id": call.ID})
}

// thousands formats like toLocaleString("en"): 8192 -> "8,192".
func thousands(n int) string {
	s := fmt.Sprint(n)
	out := make([]byte, 0, len(s)+len(s)/3)
	for i := range len(s) {
		if i > 0 && (len(s)-i)%3 == 0 {
			out = append(out, ',')
		}
		out = append(out, s[i])
	}
	return string(out)
}

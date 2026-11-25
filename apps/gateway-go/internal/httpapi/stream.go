package httpapi

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"
)

// answerStream ports route.ts answerStream: pass the SSE stream through line by line, rewriting `model` in each
// chunk, and charge once at the end, before the response finishes. If the final usage chunk never comes, the
// streamed deltas are counted as output tokens. If the client leaves, reading continues so the call is still charged.
func (s *Server) answerStream(w http.ResponseWriter, body io.Reader, call Call, started time.Time) {
	flusher, _ := w.(http.Flusher)
	h := w.Header()
	h.Set("Content-Type", "text/event-stream; charset=utf-8")
	h.Set("Cache-Control", "no-cache, no-transform")
	h.Set("x-boli-request-id", call.ID)
	w.WriteHeader(http.StatusOK)

	open := true
	send := func(text string) {
		if !open {
			return
		}
		if _, err := io.WriteString(w, text); err != nil {
			open = false // the client left; keep reading the model so the call is charged
			return
		}
		if flusher != nil {
			flusher.Flush()
		}
	}

	var (
		seen           *usage
		deltas         int64
		reasoningDelta int64
		firstTokenMs   *int64
		failed         bool
	)

	handleLine := func(line string) {
		if !strings.HasPrefix(line, "data:") {
			send(line + "\n")
			return
		}
		data := strings.TrimSpace(line[len("data:"):])
		if data == "[DONE]" || data == "" {
			send(line + "\n")
			return
		}
		dec := json.NewDecoder(strings.NewReader(data))
		dec.UseNumber()
		var chunk map[string]any
		if err := dec.Decode(&chunk); err != nil || chunk == nil {
			send(line + "\n")
			return
		}
		if _, isErr := chunk["error"].(map[string]any); isErr {
			failed = true
		}
		if u, has := chunk["usage"]; has && u != nil {
			if got := usageOf(u); got != nil {
				seen = got
			}
		}
		if choices, ok := chunk["choices"].([]any); ok {
			for _, c := range choices {
				cm, _ := c.(map[string]any)
				d, _ := cm["delta"].(map[string]any)
				if d == nil {
					continue
				}
				content, _ := d["content"].(string)
				reasoning, _ := d["reasoning_content"].(string)
				if content != "" {
					deltas++
				}
				if reasoning != "" {
					deltas++
					reasoningDelta++
				}
				if firstTokenMs == nil && (content != "" || reasoning != "") {
					ms := time.Since(started).Milliseconds()
					firstTokenMs = &ms
				}
			}
		}
		if _, has := chunk["model"]; has {
			chunk["model"] = call.Model
		}
		var buf bytes.Buffer
		enc := json.NewEncoder(&buf)
		enc.SetEscapeHTML(false) // JSON.stringify does not escape <, > and &
		_ = enc.Encode(chunk)
		send("data: " + strings.TrimRight(buf.String(), "\n") + "\n")
	}

	sc := bufio.NewScanner(body)
	sc.Buffer(make([]byte, 64*1024), 4<<20) // one SSE line can be long; allow up to 4 MB
	for sc.Scan() {
		handleLine(sc.Text()) // Scan strips "\n" and a trailing "\r", like the TS .replace(/\r$/, "")
	}
	if err := sc.Err(); err != nil {
		failed = deltas == 0
		s.Log.Error("stream from the model broke", "err", err)
	}

	ok := !failed && (seen != nil || deltas > 0)
	call.InputTokens, call.OutputTokens, call.ReasoningTokens = 0, deltas, reasoningDelta
	if seen != nil {
		call.InputTokens, call.OutputTokens, call.ReasoningTokens = seen.input, seen.output, seen.reasoning
	}
	call.LatencyMs, call.FirstTokenMs = time.Since(started).Milliseconds(), firstTokenMs
	call.Status, call.ErrorCode = "ok", ""
	if !ok {
		call.Status, call.ErrorCode = "error", "model_unavailable"
	}
	s.record(context.Background(), call)
}

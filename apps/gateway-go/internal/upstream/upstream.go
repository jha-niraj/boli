// Package upstream calls llama-server's OpenAI-compatible endpoint.
//
// Ports apps/main/lib/platform/upstream.ts. `think` (Boli's extension) becomes llama-server's per-request template
// switch chat_template_kwargs.enable_thinking, always sent explicitly (false unless think is true).
package upstream

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"bolihq.com/gateway/internal/boli"
	"bolihq.com/gateway/internal/openai"
)

// Client talks to one llama-server.
type Client struct {
	Origin string // e.g. http://localhost:8080 (no trailing slash, no /v1)
	APIKey string // blank = no Authorization header
	Model  string // what boli-chat is called upstream (BOLI_UPSTREAM_MODEL)
	HTTP   *http.Client
}

// New returns a client. No overall timeout: a long answer or stream may legitimately take minutes (the TS fetch has
// none either). Connecting and waiting for the first response headers are bounded instead.
func New(origin, apiKey, model string) *Client {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.ResponseHeaderTimeout = 5 * time.Minute // a long prompt is processed before headers arrive
	return &Client{Origin: origin, APIKey: apiKey, Model: model, HTTP: &http.Client{Transport: transport}}
}

// payload is the exact body llama-server receives.
type payload struct {
	Model              string                `json:"model"`
	Messages           []openai.Message      `json:"messages"`
	Temperature        *float64              `json:"temperature,omitempty"`
	TopP               *float64              `json:"top_p,omitempty"`
	TopK               *int64                `json:"top_k,omitempty"`
	MaxTokens          int64                 `json:"max_tokens"`
	Stream             bool                  `json:"stream"`
	StreamOptions      *openai.StreamOptions `json:"stream_options,omitempty"`
	Stop               *openai.Stop          `json:"stop,omitempty"`
	Seed               *int64                `json:"seed,omitempty"`
	PresencePenalty    *float64              `json:"presence_penalty,omitempty"`
	FrequencyPenalty   *float64              `json:"frequency_penalty,omitempty"`
	User               *string               `json:"user,omitempty"`
	ChatTemplateKwargs map[string]any        `json:"chat_template_kwargs"`
}

// buildPayload ports route.ts (max_tokens ?? max_completion_tokens ?? KURA_DEFAULTS.maxTokens) and upstream.ts
// (model mapped, stream forced, include_usage forced on streams, think -> enable_thinking).
func (c *Client) buildPayload(req openai.ChatRequest) payload {
	maxTokens := int64(boli.DefaultMaxTokens)
	switch {
	case req.MaxTokens != nil:
		maxTokens = *req.MaxTokens
	case req.MaxCompletionTokens != nil:
		maxTokens = *req.MaxCompletionTokens
	}
	model := req.Model
	if model == boli.BoliChat.ID || model == "" {
		model = c.Model
	}
	stream := req.IsStream()
	p := payload{
		Model:              model,
		Messages:           req.Messages,
		Temperature:        req.Temperature,
		TopP:               req.TopP,
		TopK:               req.TopK,
		MaxTokens:          maxTokens,
		Stream:             stream,
		Stop:               req.Stop,
		Seed:               req.Seed,
		PresencePenalty:    req.PresencePenalty,
		FrequencyPenalty:   req.FrequencyPenalty,
		User:               req.User,
		ChatTemplateKwargs: map[string]any{"enable_thinking": req.Think != nil && *req.Think},
	}
	if stream {
		// upstream.ts: { ...stream_options, include_usage: true } - usage is needed to charge the call.
		yes := true
		p.StreamOptions = &openai.StreamOptions{IncludeUsage: &yes}
	}
	return p
}

// Chat sends the request. The caller must close the response body. A non-2xx status is NOT an error here: the
// handler decides what each status means. Only a request that never got a response returns an error.
func (c *Client) Chat(ctx context.Context, req openai.ChatRequest) (*http.Response, error) {
	body, err := json.Marshal(c.buildPayload(req))
	if err != nil {
		return nil, fmt.Errorf("encode upstream body: %w", err)
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.Origin+"/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build upstream request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if c.APIKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+c.APIKey)
	}
	res, err := c.HTTP.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("call llama-server: %w", err)
	}
	return res, nil
}

// Package openai holds the OpenAI-compatible request and response shapes, and the request validation.
//
// Validation ports apps/main/schemas/chat-completions.ts (zod). zod reports every issue and the route returns the
// FIRST one (route.ts: parsed.error.issues[0]), so this file checks fields in the schema's key order and stops at the
// first problem. Messages are copied word for word from the schema, or from zod 4's default messages where the schema
// sets none.
package openai

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"unicode/utf16"

	"bolihq.com/gateway/internal/boli"
)

// TextPart is one { "type": "text", "text": "..." } part of a message's content.
type TextPart struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// Content is a message's content: a plain string, or a list of text parts (images are not supported).
type Content struct {
	Text  string
	Parts []TextPart // non-nil means the array form was sent
}

// MarshalJSON writes the content back in the form it arrived in.
func (c Content) MarshalJSON() ([]byte, error) {
	if c.Parts != nil {
		return json.Marshal(c.Parts)
	}
	return json.Marshal(c.Text)
}

// Message is one chat message. Unknown fields are dropped (zod strips them), so only these reach the model.
type Message struct {
	Role    string  `json:"role"`
	Content Content `json:"content"`
	Name    *string `json:"name,omitempty"`
}

// StreamOptions is OpenAI's stream_options.
type StreamOptions struct {
	IncludeUsage *bool `json:"include_usage,omitempty"`
}

// Stop is a single stop string or up to 4 of them.
type Stop struct {
	One  string
	Many []string // non-nil means the array form was sent
}

// MarshalJSON writes the stop value back in the form it arrived in.
func (s Stop) MarshalJSON() ([]byte, error) {
	if s.Many != nil {
		return json.Marshal(s.Many)
	}
	return json.Marshal(s.One)
}

// ChatRequest is a validated POST /v1/chat/completions body. A nil pointer means the field was not sent.
type ChatRequest struct {
	Model               string
	Messages            []Message
	Temperature         *float64
	TopP                *float64
	TopK                *int64
	MaxTokens           *int64
	MaxCompletionTokens *int64
	Stream              *bool
	StreamOptions       *StreamOptions
	Stop                *Stop
	Seed                *int64
	PresencePenalty     *float64
	FrequencyPenalty    *float64
	User                *string
	Think               *bool // Boli's extension: thinking on or off
}

// IsStream reports whether the caller asked for a stream (route.ts: body.stream === true).
func (r ChatRequest) IsStream() bool { return r.Stream != nil && *r.Stream }

// ErrNotJSON means the body could not be parsed as JSON at all.
var ErrNotJSON = errors.New("request body is not valid JSON")

// ValidationError is the first problem found, with its path ("messages.0.role").
type ValidationError struct {
	Path    []string
	Message string
}

// Error formats the issue exactly like route.ts: `${message} (at ${path.join(".")})`, no suffix when the path is empty.
func (e *ValidationError) Error() string {
	if len(e.Path) == 0 {
		return e.Message
	}
	return fmt.Sprintf("%s (at %s)", e.Message, strings.Join(e.Path, "."))
}

func issue(msg string, path ...string) *ValidationError {
	return &ValidationError{Path: path, Message: msg}
}

// Decode parses and validates a request body. The error is ErrNotJSON or a *ValidationError.
func Decode(body []byte) (ChatRequest, error) {
	var req ChatRequest
	if !json.Valid(body) {
		return req, ErrNotJSON
	}
	var top map[string]json.RawMessage
	if kind := jsonKind(body); kind != "object" {
		return req, issue("Invalid input: expected object, received " + kind)
	}
	if err := json.Unmarshal(body, &top); err != nil {
		return req, ErrNotJSON
	}
	// Each step below fills one field or returns the first issue. Order = the zod schema's key order.
	steps := []func() *ValidationError{
		func() *ValidationError { return parseModel(top, &req) },
		func() *ValidationError { return parseMessages(top, &req) },
		func() *ValidationError {
			return rangeField(top, "temperature", boli.TemperatureRange, false, &req.Temperature, nil)
		},
		func() *ValidationError { return rangeField(top, "top_p", boli.TopPRange, false, &req.TopP, nil) },
		func() *ValidationError { return rangeField(top, "top_k", boli.TopKRange, true, nil, &req.TopK) },
		func() *ValidationError {
			return rangeField(top, "max_tokens", boli.MaxTokensRange, true, nil, &req.MaxTokens)
		},
		func() *ValidationError {
			return rangeField(top, "max_completion_tokens", boli.MaxTokensRange, true, nil, &req.MaxCompletionTokens)
		},
		func() *ValidationError { return boolField(top, "stream", &req.Stream) },
		func() *ValidationError { return parseStreamOptions(top, &req) },
		func() *ValidationError { return parseStop(top, &req) },
		func() *ValidationError { return parseSeed(top, &req) },
		func() *ValidationError {
			return rangeField(top, "presence_penalty", boli.PenaltyRange, false, &req.PresencePenalty, nil)
		},
		func() *ValidationError {
			return rangeField(top, "frequency_penalty", boli.PenaltyRange, false, &req.FrequencyPenalty, nil)
		},
		func() *ValidationError { return maxString(top, "user", 256, &req.User) },
		func() *ValidationError { return boolField(top, "think", &req.Think) },
	}
	for _, step := range steps {
		if err := step(); err != nil {
			return ChatRequest{}, err
		}
	}
	return req, nil
}

// jsonKind names a JSON value the way zod's messages do: object, array, string, boolean, null, number.
func jsonKind(raw []byte) string {
	b := bytes.TrimSpace(raw)
	if len(b) == 0 {
		return "undefined"
	}
	switch b[0] {
	case '{':
		return "object"
	case '[':
		return "array"
	case '"':
		return "string"
	case 't', 'f':
		return "boolean"
	case 'n':
		return "null"
	default:
		return "number"
	}
}

// utf16Len counts like JavaScript's string.length, which is what zod's .max(n) checks (not bytes, not runes).
func utf16Len(s string) int {
	n := 0
	for _, r := range s {
		n += utf16.RuneLen(r)
	}
	return n
}

func tooBig(max int) string {
	return fmt.Sprintf("Too big: expected string to have <=%d characters", max)
}

func parseModel(top map[string]json.RawMessage, req *ChatRequest) *ValidationError {
	const needModel = `Send a model, for example "boli-chat".`
	raw, ok := top["model"]
	if !ok || jsonKind(raw) != "string" {
		return issue(needModel, "model")
	}
	_ = json.Unmarshal(raw, &req.Model)
	if _, known := boli.ModelByID(req.Model); !known {
		return issue(fmt.Sprintf("Unknown model. Use one of: %s (GET /v1/models lists them).", strings.Join(boli.ModelIDs(), ", ")), "model")
	}
	return nil
}

func parseMessages(top map[string]json.RawMessage, req *ChatRequest) *ValidationError {
	raw, ok := top["messages"]
	if !ok || jsonKind(raw) != "array" {
		return issue("Send messages as an array.", "messages")
	}
	var items []json.RawMessage
	_ = json.Unmarshal(raw, &items)
	// zod checks every element, then the length. The first element issue therefore comes before "at least one".
	msgs := make([]Message, 0, len(items))
	for i, item := range items {
		idx := fmt.Sprint(i)
		if k := jsonKind(item); k != "object" {
			return issue("Invalid input: expected object, received "+k, "messages", idx)
		}
		var fields map[string]json.RawMessage
		_ = json.Unmarshal(item, &fields)
		var m Message

		roleRaw, has := fields["role"]
		roleOK := false
		if has && jsonKind(roleRaw) == "string" {
			_ = json.Unmarshal(roleRaw, &m.Role)
			switch m.Role {
			case "system", "developer", "user", "assistant":
				roleOK = true
			}
		}
		if !roleOK {
			return issue("Each message needs a role: system, developer, user or assistant.", "messages", idx, "role")
		}

		content, ok := parseContent(fields["content"])
		if !ok {
			return issue(`Message content must be a string, or an array of { type: "text", text } parts (images are not supported).`, "messages", idx, "content")
		}
		m.Content = content

		if nameRaw, has := fields["name"]; has {
			if k := jsonKind(nameRaw); k != "string" {
				return issue("Invalid input: expected string, received "+k, "messages", idx, "name")
			}
			var name string
			_ = json.Unmarshal(nameRaw, &name)
			if utf16Len(name) > 64 {
				return issue(tooBig(64), "messages", idx, "name")
			}
			m.Name = &name
		}
		msgs = append(msgs, m)
	}
	if len(items) < 1 {
		return issue("Send at least one message.", "messages")
	}
	if len(items) > 200 {
		return issue("Send at most 200 messages.", "messages")
	}
	req.Messages = msgs
	return nil
}

// parseContent accepts a string, or a non-empty array of {type: "text", text: string} (extra keys dropped).
func parseContent(raw json.RawMessage) (Content, bool) {
	switch jsonKind(raw) {
	case "string":
		var s string
		_ = json.Unmarshal(raw, &s)
		return Content{Text: s}, true
	case "array":
		var items []json.RawMessage
		_ = json.Unmarshal(raw, &items)
		if len(items) == 0 {
			return Content{}, false
		}
		parts := make([]TextPart, 0, len(items))
		for _, it := range items {
			if jsonKind(it) != "object" {
				return Content{}, false
			}
			var f map[string]json.RawMessage
			_ = json.Unmarshal(it, &f)
			var typ, text string
			if jsonKind(f["type"]) != "string" || jsonKind(f["text"]) != "string" {
				return Content{}, false
			}
			_ = json.Unmarshal(f["type"], &typ)
			_ = json.Unmarshal(f["text"], &text)
			if typ != "text" {
				return Content{}, false
			}
			parts = append(parts, TextPart{Type: typ, Text: text})
		}
		return Content{Parts: parts}, true
	default:
		return Content{}, false
	}
}

// number reads a JSON number. ok is false for any other kind.
func number(raw json.RawMessage) (float64, bool) {
	if jsonKind(raw) != "number" {
		return 0, false
	}
	var f float64
	if err := json.Unmarshal(raw, &f); err != nil {
		return 0, false
	}
	return f, true
}

// isSafeInt is zod 4's .int(): a whole number within JavaScript's safe integer range.
func isSafeInt(f float64) bool {
	return f == math.Trunc(f) && math.Abs(f) <= 1<<53-1
}

// rangeField ports `range()` / `intRange()` from the schema: custom messages for type, min, max and whole number.
// Exactly one of fl / in is used, depending on whole.
func rangeField(top map[string]json.RawMessage, name string, r boli.Range, whole bool, fl **float64, in **int64) *ValidationError {
	raw, ok := top[name]
	if !ok {
		return nil
	}
	f, isNum := number(raw)
	if !isNum {
		return issue(name+" must be a number.", name)
	}
	// zod runs the checks in the order they were chained: .min, .max, then .int.
	if f < r.Min {
		return issue(fmt.Sprintf("%s must be at least %s.", name, jsNum(r.Min)), name)
	}
	if f > r.Max {
		return issue(fmt.Sprintf("%s must be at most %s.", name, jsNum(r.Max)), name)
	}
	if whole {
		if !isSafeInt(f) {
			return issue(name+" must be a whole number.", name)
		}
		v := int64(f)
		*in = &v
		return nil
	}
	*fl = &f
	return nil
}

// jsNum prints a number the way a JS template string does: 1.5 -> "1.5", 0 -> "0", -2 -> "-2".
func jsNum(f float64) string {
	return fmt.Sprintf("%v", f)
}

func boolField(top map[string]json.RawMessage, name string, dst **bool) *ValidationError {
	raw, ok := top[name]
	if !ok {
		return nil
	}
	if k := jsonKind(raw); k != "boolean" {
		return issue("Invalid input: expected boolean, received "+k, name)
	}
	var b bool
	_ = json.Unmarshal(raw, &b)
	*dst = &b
	return nil
}

func parseStreamOptions(top map[string]json.RawMessage, req *ChatRequest) *ValidationError {
	raw, ok := top["stream_options"]
	if !ok {
		return nil
	}
	if k := jsonKind(raw); k != "object" {
		return issue("Invalid input: expected object, received "+k, "stream_options")
	}
	var f map[string]json.RawMessage
	_ = json.Unmarshal(raw, &f)
	so := StreamOptions{}
	if v, has := f["include_usage"]; has {
		if k := jsonKind(v); k != "boolean" {
			return issue("Invalid input: expected boolean, received "+k, "stream_options", "include_usage")
		}
		var b bool
		_ = json.Unmarshal(v, &b)
		so.IncludeUsage = &b
	}
	req.StreamOptions = &so
	return nil
}

func parseStop(top map[string]json.RawMessage, req *ChatRequest) *ValidationError {
	raw, ok := top["stop"]
	if !ok {
		return nil
	}
	// z.union([z.string().max(100), z.array(z.string().max(100)).max(4)]) with no custom message.
	bad := issue("Invalid input", "stop")
	switch jsonKind(raw) {
	case "string":
		var s string
		_ = json.Unmarshal(raw, &s)
		if utf16Len(s) > 100 {
			return bad
		}
		req.Stop = &Stop{One: s}
	case "array":
		var items []json.RawMessage
		_ = json.Unmarshal(raw, &items)
		if len(items) > 4 {
			return bad
		}
		many := make([]string, 0, len(items))
		for _, it := range items {
			if jsonKind(it) != "string" {
				return bad
			}
			var s string
			_ = json.Unmarshal(it, &s)
			if utf16Len(s) > 100 {
				return bad
			}
			many = append(many, s)
		}
		req.Stop = &Stop{Many: many}
	default:
		return bad
	}
	return nil
}

func parseSeed(top map[string]json.RawMessage, req *ChatRequest) *ValidationError {
	raw, ok := top["seed"]
	if !ok {
		return nil
	}
	f, isNum := number(raw)
	if !isNum {
		return issue("Invalid input: expected number, received "+jsonKind(raw), "seed")
	}
	if !isSafeInt(f) {
		return issue("Invalid input: expected int, received number", "seed")
	}
	v := int64(f)
	req.Seed = &v
	return nil
}

func maxString(top map[string]json.RawMessage, name string, max int, dst **string) *ValidationError {
	raw, ok := top[name]
	if !ok {
		return nil
	}
	if k := jsonKind(raw); k != "string" {
		return issue("Invalid input: expected string, received "+k, name)
	}
	var s string
	_ = json.Unmarshal(raw, &s)
	if utf16Len(s) > max {
		return issue(tooBig(max), name)
	}
	*dst = &s
	return nil
}

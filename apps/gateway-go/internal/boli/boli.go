// Package boli is the Go copy of Boli's platform contract: prices, the model list, limits and the API error table.
//
// It ports packages/boli/src/boli.ts. Only the parts the /v1 endpoint needs are here (no brand copy, no credit
// packs). Change a number in the TS file and you must change it here too - the TS file stays the source of truth.
package boli

// MicroPerCredit: 1 credit = Rs 1 = 1,000,000 micro-credits. Every balance and cost is an integer number of
// micro-credits, never a float (packages/boli/src/boli.ts, MICRO_PER_CREDIT).
const MicroPerCredit int64 = 1_000_000

// Price is credits per 1M tokens. Because 1 credit = 1e6 micro, it is also micro-credits PER TOKEN.
type Price struct {
	Input  int64
	Output int64
}

// Model is one model the API serves (BoliModel in the TS).
type Model struct {
	ID              string // public id used in the API, stable when the weights change
	Label           string
	Base            string
	Licence         string
	ContextTokens   int
	PricePerMillion Price
	Languages       []string
}

// BoliChat is the one model we serve today.
var BoliChat = Model{
	ID:              "boli-chat",
	Label:           "Gemma 4 E4B, 4-bit",
	Base:            "google/gemma-4-E4B-it (Apache 2.0), quantized by ggml-org",
	Licence:         "Apache 2.0",
	ContextTokens:   8192,
	PricePerMillion: Price{Input: 2, Output: 6},
	Languages:       []string{"English", "Romanized Nepali", "Nepali (Devanagari)", "Code-mixed"},
}

// Models lists every model, in the order GET /v1/models shows them.
var Models = []Model{BoliChat}

// ModelByID finds a model by its public id. The second result says whether it was found
// (the TS returns `undefined` instead).
func ModelByID(id string) (Model, bool) {
	for _, m := range Models {
		if m.ID == id {
			return m, true
		}
	}
	return Model{}, false
}

// ModelIDs returns the public ids, for error messages ("Use one of: boli-chat").
func ModelIDs() []string {
	ids := make([]string, 0, len(Models))
	for _, m := range Models {
		ids = append(ids, m.ID)
	}
	return ids
}

// CostMicro is the cost of one call in micro-credits. Thinking tokens are already inside outputTokens.
//
// The TS (boli.ts, costMicro) does Math.ceil(raw) because a price COULD one day be fractional. Our prices are whole
// micro-credits per token, so raw is already a whole number and the ceil has nothing to do. If a price ever becomes
// fractional, this function must change to integer ceil division, never to floats.
func CostMicro(m Model, inputTokens, outputTokens int64) int64 {
	raw := inputTokens*m.PricePerMillion.Input + outputTokens*m.PricePerMillion.Output
	if raw > 0 {
		return raw
	}
	return 0
}

// Range is an inclusive [Min, Max] limit for a number in the request.
type Range struct {
	Min float64
	Max float64
}

// Limits from KURA_LIMITS (boli.ts): the API and Kura accept the same ranges.
var (
	TemperatureRange = Range{Min: 0, Max: 1.5}
	TopPRange        = Range{Min: 0.05, Max: 1}
	TopKRange        = Range{Min: 1, Max: 200}
	// API callers may ask for as little as 1 token (schemas/chat-completions.ts, API_MAX_TOKENS); the max is Kura's.
	MaxTokensRange = Range{Min: 1, Max: 4096}
	PenaltyRange   = Range{Min: -2, Max: 2}
)

// DefaultMaxTokens is sent upstream when the request names neither max_tokens nor max_completion_tokens
// (KURA_DEFAULTS.maxTokens).
const DefaultMaxTokens = 1024

// API key shape and the shared per-account rate limit.
const (
	APIKeyPrefix       = "boli_sk_"
	APIKeyRandomLength = 32
	RateLimitPerMin    = 30
)

// ErrorCode is one of the OpenAI-style error codes the API returns. A named string type, so a plain typo'd string
// cannot be passed where a code is expected without a conversion.
type ErrorCode string

const (
	ErrInvalidRequest    ErrorCode = "invalid_request"
	ErrInvalidAPIKey     ErrorCode = "invalid_api_key"
	ErrInsufficientQuota ErrorCode = "insufficient_quota"
	ErrNotFound          ErrorCode = "not_found"
	ErrRateLimitExceeded ErrorCode = "rate_limit_exceeded"
	ErrModelUnavailable  ErrorCode = "model_unavailable"
)

// ErrorInfo is the HTTP status and OpenAI `type` for one code.
type ErrorInfo struct {
	Status int
	Type   string
}

// APIErrors is API_ERRORS from boli.ts.
var APIErrors = map[ErrorCode]ErrorInfo{
	ErrInvalidRequest:    {Status: 400, Type: "invalid_request_error"},
	ErrInvalidAPIKey:     {Status: 401, Type: "authentication_error"},
	ErrInsufficientQuota: {Status: 402, Type: "insufficient_quota"},
	ErrNotFound:          {Status: 404, Type: "invalid_request_error"},
	ErrRateLimitExceeded: {Status: 429, Type: "rate_limit_error"},
	ErrModelUnavailable:  {Status: 503, Type: "server_error"},
}

// Info returns the status and type for a code. A code missing from the table (a bug) is treated as a 500 server
// error rather than a zero status, which net/http would reject.
func (c ErrorCode) Info() ErrorInfo {
	if info, ok := APIErrors[c]; ok {
		return info
	}
	return ErrorInfo{Status: 500, Type: "server_error"}
}

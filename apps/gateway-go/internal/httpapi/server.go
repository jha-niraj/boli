// Package httpapi is the public, OpenAI-compatible API: the Go port of apps/main/app/api/v1/[...path]/route.ts.
//
//	GET  /v1/models            the models we serve
//	GET  /v1/models/{id}       one model
//	POST /v1/chat/completions  key -> rate limit -> balance -> validate -> llama-server -> charge
//
// Until the store lands (Chapter 8), the server runs in dev mode only: no key check, no rate limit, no balance, and
// each call's record is logged instead of charged. Metadata only: prompts and answers are never logged.
package httpapi

import (
	"context"
	"crypto/rand"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"bolihq.com/gateway/internal/apierr"
	"bolihq.com/gateway/internal/boli"
	"bolihq.com/gateway/internal/upstream"
)

// Call is one model call's record: the future inference_request row (packages/db/src/schema/platform.ts).
type Call struct {
	ID              string
	Model           string
	Stream          bool
	InputTokens     int64
	OutputTokens    int64
	ReasoningTokens int64
	LatencyMs       int64
	FirstTokenMs    *int64
	Status          string // "ok" or "error"
	ErrorCode       boli.ErrorCode
}

// Recorder records and charges one call (lib/platform/credits.ts chargeInference). Declared HERE, where it is used:
// the store package will satisfy it in Chapter 8 without importing this package.
type Recorder interface {
	Record(ctx context.Context, c Call) error
}

// Server holds what the handlers need. No globals: main builds one and passes it the pieces.
type Server struct {
	Upstream *upstream.Client
	Recorder Recorder // nil = dev mode: the record is logged, nothing is charged
	Log      *slog.Logger
}

// Handler returns the routes. Go 1.22+ patterns carry the method and can capture path segments ({id}).
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /v1/models", s.listModels)
	mux.HandleFunc("GET /v1/models/{id}", s.getModel)
	mux.HandleFunc("POST /v1/chat/completions", s.chatCompletions)
	mux.HandleFunc("/v1/", s.notFound) // anything else under /v1, any method
	return s.logRequests(mux)
}

// modelsCreated ports MODELS_CREATED = Date.UTC(2026, 10, 24) / 1000. JS months start at 0, so 10 is NOVEMBER.
var modelsCreated = time.Date(2026, time.November, 24, 0, 0, 0, 0, time.UTC).Unix()

type modelObject struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	OwnedBy string `json:"owned_by"`
}

func toModelObject(m boli.Model) modelObject {
	return modelObject{ID: m.ID, Object: "model", Created: modelsCreated, OwnedBy: "boli"}
}

func (s *Server) listModels(w http.ResponseWriter, r *http.Request) {
	data := make([]modelObject, 0, len(boli.Models))
	for _, m := range boli.Models {
		data = append(data, toModelObject(m))
	}
	writeJSON(w, http.StatusOK, map[string]any{"object": "list", "data": data}, nil)
}

func (s *Server) getModel(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if m, ok := boli.ModelByID(id); ok {
		writeJSON(w, http.StatusOK, toModelObject(m), nil)
		return
	}
	apierr.Write(w, boli.ErrNotFound, fmt.Sprintf(`There is no model "%s". GET /v1/models lists the models you can use.`, id), nil)
}

func (s *Server) notFound(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/v1"), "/")
	apierr.Write(w, boli.ErrNotFound, fmt.Sprintf("There is no endpoint /v1/%s. Use POST /v1/chat/completions or GET /v1/models.", path), nil)
}

// statusRecorder remembers the status a handler wrote, for the access log. It passes Flush through, or streaming
// would stop working behind the middleware.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func (r *statusRecorder) Flush() {
	if f, ok := r.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// logRequests is middleware: a function that wraps a handler and returns a handler.
func (s *Server) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		s.Log.Info("request", "method", r.Method, "path", r.URL.Path, "status", rec.status, "ms", time.Since(started).Milliseconds())
	})
}

// newRequestID returns a random UUID v4, like crypto.randomUUID() in the TS.
func newRequestID() string {
	var b [16]byte
	_, _ = rand.Read(b[:]) // crypto/rand.Read never fails (Go 1.24+)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

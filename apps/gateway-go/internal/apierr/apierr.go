// Package apierr writes errors in the OpenAI shape: {"error": {"message", "type", "code"}}.
//
// Ports apiError() in apps/main/app/api/v1/[...path]/route.ts; statuses and types come from boli.APIErrors.
package apierr

import (
	"encoding/json"
	"net/http"

	"bolihq.com/gateway/internal/boli"
)

type body struct {
	Error detail `json:"error"`
}

type detail struct {
	Message string         `json:"message"`
	Type    string         `json:"type"`
	Code    boli.ErrorCode `json:"code"`
}

// Write sends one error response. Extra headers (Retry-After) are set before the status line goes out.
func Write(w http.ResponseWriter, code boli.ErrorCode, message string, headers map[string]string) {
	info := code.Info()
	for k, v := range headers {
		w.Header().Set(k, v)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(info.Status)
	_ = json.NewEncoder(w).Encode(body{Error: detail{Message: message, Type: info.Type, Code: code}})
}

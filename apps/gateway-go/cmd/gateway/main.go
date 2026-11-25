// Command gateway is Boli's OpenAI-compatible API in Go (an experiment next to apps/main, port 3110).
//
//	cd apps/gateway-go && GATEWAY_DEV_NO_DB=1 go run ./cmd/gateway
//
// It reads .env.local in the current folder (LLAMA_BASE_URL, LLAMA_API_KEY, BOLI_UPSTREAM_MODEL) without overriding
// variables already set in the shell.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"bolihq.com/gateway/internal/config"
	"bolihq.com/gateway/internal/httpapi"
	"bolihq.com/gateway/internal/upstream"
)

func main() {
	log := slog.New(slog.NewTextHandler(os.Stderr, nil))
	if err := run(log); err != nil {
		log.Error("gateway stopped", "err", err)
		os.Exit(1)
	}
}

// run holds the real work so every error is returned (and deferred cleanups run) instead of os.Exit in the middle.
func run(log *slog.Logger) error {
	if err := config.LoadDotEnv(".env.local"); err != nil {
		return err
	}
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	srv := &httpapi.Server{
		Upstream: upstream.New(cfg.LlamaOrigin, cfg.LlamaAPIKey, cfg.UpstreamModel),
		Log:      log,
	}

	host := ""
	if cfg.DevNoDB {
		host = "127.0.0.1" // no auth in dev mode: never reachable from the network
		log.Warn("DEV MODE: no database - no key check, no rate limit, nothing is charged")
	}
	httpServer := &http.Server{
		Addr:              net.JoinHostPort(host, cfg.Port),
		Handler:           srv.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
		// No WriteTimeout: a streamed answer can run for minutes.
	}

	// Stop on Ctrl-C or SIGTERM: stop accepting, let running requests finish (up to 30s), then return.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	errCh := make(chan error, 1)
	go func() {
		log.Info("listening", "addr", httpServer.Addr, "upstream", cfg.LlamaOrigin)
		errCh <- httpServer.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	case <-ctx.Done():
		log.Info("shutting down")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		return httpServer.Shutdown(shutdownCtx)
	}
}

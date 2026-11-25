// Package config reads the gateway's settings from the environment, once, at startup.
//
// It ports the env reads scattered through the TS (packages/ai/src/boli.ts boliUpstream, lib/platform/ratelimit.ts,
// packages/billing CREDITS_ENFORCED). Errors name the missing variable and never print a value (AGENTS.md section 8).
package config

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"strings"
)

// Config is everything the service needs. Built once in main and passed down; nothing else reads os.Getenv.
type Config struct {
	Port string // GATEWAY_PORT, default 3110

	// DevNoDB (GATEWAY_DEV_NO_DB=1) runs without a database: NO key check, NO rate limit, NO charge. For trying the
	// model path before the Postgres chapter lands. The server then binds 127.0.0.1 only.
	DevNoDB bool

	LlamaOrigin   string // LLAMA_BASE_URL without a trailing "/" or "/v1"
	LlamaAPIKey   string // LLAMA_API_KEY, blank = no Authorization header
	UpstreamModel string // BOLI_UPSTREAM_MODEL: what "boli-chat" is called on llama-server
}

// Load reads the environment. Missing required keys are all reported together.
func Load() (Config, error) {
	c := Config{
		Port:          env("GATEWAY_PORT"),
		DevNoDB:       env("GATEWAY_DEV_NO_DB") == "1",
		LlamaAPIKey:   env("LLAMA_API_KEY"),
		UpstreamModel: env("BOLI_UPSTREAM_MODEL"),
	}
	if c.Port == "" {
		c.Port = "3110"
	}
	// packages/ai/src/boli.ts baseOrigin: .replace(/\/+$/, "").replace(/\/v1$/, "")
	c.LlamaOrigin = strings.TrimSuffix(strings.TrimRight(env("LLAMA_BASE_URL"), "/"), "/v1")

	var missing []string
	if c.LlamaOrigin == "" {
		missing = append(missing, "LLAMA_BASE_URL")
	}
	if c.UpstreamModel == "" {
		missing = append(missing, "BOLI_UPSTREAM_MODEL")
	}
	if !c.DevNoDB {
		// The database arrives in Chapter 8. Until then the only way to run is the explicit dev mode.
		return c, errors.New("the database layer is not built yet: set GATEWAY_DEV_NO_DB=1 to run without auth and charging")
	}
	if len(missing) > 0 {
		return c, fmt.Errorf("%s is not set", strings.Join(missing, ", "))
	}
	return c, nil
}

// env reads a variable; whitespace-only counts as missing.
func env(name string) string {
	return strings.TrimSpace(os.Getenv(name))
}

// LoadDotEnv copies KEY=VALUE lines from a file into the environment, without overriding variables that are already
// set. A missing file is not an error. Values are never logged.
func LoadDotEnv(path string) error {
	f, err := os.Open(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("open %s: %w", path, err)
	}
	defer f.Close()

	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(strings.TrimPrefix(key, "export "))
		value = strings.TrimSpace(value)
		if len(value) >= 2 && (value[0] == '"' || value[0] == '\'') && value[len(value)-1] == value[0] {
			value = value[1 : len(value)-1]
		}
		if _, set := os.LookupEnv(key); !set {
			if err := os.Setenv(key, value); err != nil {
				return fmt.Errorf("set %s: %w", key, err)
			}
		}
	}
	if err := sc.Err(); err != nil {
		return fmt.Errorf("read %s: %w", path, err)
	}
	return nil
}

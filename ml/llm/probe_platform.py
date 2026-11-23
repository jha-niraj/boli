"""Acceptance test for the Boli platform API (OpenAI-compatible /v1). Standard library only.

Usage:
    python3 ml/llm/probe_platform.py [base_url] [--rate]

    base_url  origin of the app, default http://localhost:3100 (a trailing /v1 is accepted)
    --rate    also fire 31 tiny requests and expect a 429 with Retry-After (spends a few micro-credits)

The key is read from env BOLI_API_KEY or ~/.config/boli/platform_key and never printed.
Exit code is 1 if any check fails.
"""
from __future__ import annotations

import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.request

ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
RATE = "--rate" in sys.argv[1:]
BASE = (ARGS[0] if ARGS else "http://localhost:3100").rstrip("/")
if BASE.endswith("/v1"):
    BASE = BASE[:-3]
MODEL = "boli-chat"
TIMEOUT = 300


def load_key() -> str | None:
    key = os.environ.get("BOLI_API_KEY", "").strip()
    if key:
        return key
    path = pathlib.Path.home() / ".config/boli/platform_key"
    if path.exists():
        return path.read_text().strip() or None
    return None


KEY = load_key()


class Resp:
    def __init__(self, status: int, headers: dict, body: bytes):
        self.status = status
        self.headers = {k.lower(): v for k, v in headers.items()}
        self.body = body

    def json(self):
        try:
            return json.loads(self.body.decode("utf-8"))
        except Exception:
            return None

    def error_code(self) -> str | None:
        j = self.json()
        if isinstance(j, dict) and isinstance(j.get("error"), dict):
            return j["error"].get("code")
        return None


def request(method: str, path: str, body: dict | None = None, key: str | None = None, headers: dict | None = None) -> Resp:
    h = {"Content-Type": "application/json", "Accept": "application/json"}
    if key:
        h["Authorization"] = f"Bearer {key}"
    if headers:
        h.update(headers)
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return Resp(r.status, dict(r.headers), r.read())
    except urllib.error.HTTPError as e:
        return Resp(e.code, dict(e.headers or {}), e.read() or b"")


def chat_body(content: str, max_tokens: int = 60, **extra) -> dict:
    return {"model": MODEL, "messages": [{"role": "user", "content": content}], "max_tokens": max_tokens,
            "temperature": 0.3, **extra}


def short(resp: Resp) -> str:
    j = resp.json()
    if isinstance(j, dict) and isinstance(j.get("error"), dict):
        e = j["error"]
        return f"HTTP {resp.status} code={e.get('code')} type={e.get('type')} msg={str(e.get('message'))[:80]!r}"
    return f"HTTP {resp.status} body={resp.body[:120]!r}"


RESULTS: list[tuple[str, bool]] = []


def check(name: str):
    def wrap(fn):
        t0 = time.time()
        try:
            ok, detail = fn()
        except Exception as e:
            ok, detail = False, f"{type(e).__name__}: {e}"
        ms = round((time.time() - t0) * 1000)
        RESULTS.append((name, ok))
        print(f"{'PASS' if ok else 'FAIL'}  {name:<44} {ms:>6} ms  {detail}")
        return fn
    return wrap


def run_checks() -> None:
    @check("GET /v1/models lists boli-chat")
    def _():
        r = request("GET", "/v1/models", key=KEY)
        j = r.json() or {}
        ids = [m.get("id") for m in j.get("data", []) if isinstance(m, dict)]
        return r.status == 200 and MODEL in ids, f"HTTP {r.status} ids={ids}"

    @check("POST without a key -> 401 invalid_api_key")
    def _():
        r = request("POST", "/v1/chat/completions", chat_body("hi", 8))
        return r.status == 401 and r.error_code() == "invalid_api_key", short(r)

    @check("POST with a wrong key -> 401")
    def _():
        r = request("POST", "/v1/chat/completions", chat_body("hi", 8), key="boli_sk_" + "x" * 32)
        return r.status == 401 and r.error_code() == "invalid_api_key", short(r)

    @check("x-api-key header is accepted")
    def _():
        r = request("POST", "/v1/chat/completions", chat_body("Say OK.", 8), headers={"x-api-key": KEY})
        return r.status == 200, short(r) if r.status != 200 else "HTTP 200"

    @check("English request -> 200 with choices + usage")
    def _():
        r = request("POST", "/v1/chat/completions", chat_body("What is an API key? One sentence."), key=KEY)
        j = r.json() or {}
        choices, usage = j.get("choices") or [], j.get("usage") or {}
        text = (choices[0].get("message") or {}).get("content", "") if choices else ""
        ok = r.status == 200 and bool(choices) and isinstance(usage.get("prompt_tokens"), int) \
            and isinstance(usage.get("completion_tokens"), int)
        return ok, f"HTTP {r.status} usage={usage} reply={text[:60]!r}" if r.status == 200 else short(r)

    @check("Romanized Nepali request -> 200")
    def _():
        r = request("POST", "/v1/chat/completions", chat_body("Namaste, tapai lai kasto chha? Chhoto ma bhannus."), key=KEY)
        j = r.json() or {}
        choices = j.get("choices") or []
        text = (choices[0].get("message") or {}).get("content", "") if choices else ""
        return r.status == 200 and bool(text), f"HTTP {r.status} reply={text[:60]!r}" if r.status == 200 else short(r)

    @check("empty messages -> 400 invalid_request")
    def _():
        r = request("POST", "/v1/chat/completions", {"model": MODEL, "messages": []}, key=KEY)
        return r.status == 400 and r.error_code() == "invalid_request", short(r)

    @check("unknown model -> 400/404 OpenAI error shape")
    def _():
        r = request("POST", "/v1/chat/completions", {**chat_body("hi", 8), "model": "gpt-4o-not-here"}, key=KEY)
        j = r.json() or {}
        err = j.get("error") if isinstance(j, dict) else None
        shaped = isinstance(err, dict) and all(k in err for k in ("message", "type", "code"))
        return r.status in (400, 404) and shaped, short(r)

    @check("stream -> SSE chunks then [DONE]")
    def _():
        body = json.dumps(chat_body("Count from 1 to 5.", 40, stream=True)).encode()
        req = urllib.request.Request(BASE + "/v1/chat/completions", data=body, method="POST", headers={
            "Content-Type": "application/json", "Accept": "text/event-stream", "Authorization": f"Bearer {KEY}"})
        t0 = time.time()
        ttft, chunks, done, text = None, 0, False, ""
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                ctype = r.headers.get("Content-Type", "")
                for raw in r:
                    line = raw.decode("utf-8", "replace").strip()
                    if not line.startswith("data:"):
                        continue
                    payload = line[5:].strip()
                    if payload == "[DONE]":
                        done = True
                        break
                    obj = json.loads(payload)
                    chunks += 1
                    delta = ((obj.get("choices") or [{}])[0].get("delta") or {}).get("content") or ""
                    if delta and ttft is None:
                        ttft = round((time.time() - t0) * 1000)
                    text += delta
        except urllib.error.HTTPError as e:
            return False, short(Resp(e.code, dict(e.headers or {}), e.read() or b""))
        ok = "text/event-stream" in ctype and chunks > 0 and done
        return ok, f"type={ctype.split(';')[0]} chunks={chunks} done={done} ttft={ttft}ms text={text[:40]!r}"

    if RATE:
        @check("31 requests in a minute -> 429 + Retry-After")
        def _():
            for i in range(1, 32):
                r = request("POST", "/v1/chat/completions", chat_body("Hi", 1), key=KEY)
                if r.status == 429:
                    ra = r.headers.get("retry-after")
                    ok = r.error_code() == "rate_limit_exceeded" and ra is not None
                    return ok, f"429 on request {i}, Retry-After={ra}, code={r.error_code()}"
                if r.status != 200:
                    return False, f"request {i}: {short(r)}"
            return False, "31 requests, no 429"


def main() -> int:
    print(f"Boli platform probe -> {BASE}   (key: {'found' if KEY else 'MISSING'}, rate check: {'on' if RATE else 'off'})\n")
    if not KEY:
        print("No key. Set BOLI_API_KEY or write it to ~/.config/boli/platform_key (create one at /keys).")
        return 2
    try:
        urllib.request.urlopen(BASE + "/v1/models", timeout=10)
    except urllib.error.HTTPError:
        pass
    except Exception as e:
        print(f"Cannot reach {BASE}: {e}. Is the app running?")
        return 2
    run_checks()
    failed = [n for n, ok in RESULTS if not ok]
    print(f"\n{len(RESULTS) - len(failed)}/{len(RESULTS)} passed" + (f"; failed: {', '.join(failed)}" if failed else ""))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

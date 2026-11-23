"""Measure a deployed llama-server from outside: auth, speed, and 3 requests at once.

Usage:
    python3 ml/llm/probe_remote.py https://nirajjha31-boli-chat.hf.space

The API key is read from ~/.config/boli/api_key and never printed.
"""
from __future__ import annotations

import json
import pathlib
import sys
import threading
import time
import urllib.error
import urllib.request

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "https://nirajjha31-boli-chat.hf.space"
KEY = (pathlib.Path.home() / ".config/boli/api_key").read_text().strip()
SYS = ("You are Boli, a helpful assistant for people in Nepal. Always reply in the same language AND script as the user's "
       "latest message: English -> English; Romanized Nepali (Nepali in Latin letters) -> Romanized Nepali; a mix -> the same mix "
       "in Latin letters. Never switch to Devanagari unless the user writes in Devanagari. Keep replies short: at most 80 words "
       "unless asked for more. If you are not sure a fact is true, say so instead of guessing.")


def ask(content: str, key: str | None = KEY, max_tokens: int = 120) -> tuple[float, dict | str]:
    body = json.dumps({"messages": [{"role": "system", "content": SYS}, {"role": "user", "content": content}],
                       "max_tokens": max_tokens, "temperature": 0.3}).encode()
    headers = {"Content-Type": "application/json"}
    if key:
        headers["Authorization"] = f"Bearer {key}"
    t0 = time.time()
    try:
        with urllib.request.urlopen(urllib.request.Request(f"{BASE}/v1/chat/completions", body, headers), timeout=600) as r:
            return time.time() - t0, json.load(r)
    except urllib.error.HTTPError as e:
        return time.time() - t0, f"HTTP {e.code}"


def show(label: str, wall: float, r: dict | str) -> None:
    if isinstance(r, str):
        print(f"{label}: {r} after {wall:.1f}s")
        return
    t = r.get("timings", {})
    text = r["choices"][0]["message"]["content"].strip().replace("\n", " ")
    print(f"{label}: {wall:.1f}s wall | prefill {t.get('prompt_n')} tok @ {t.get('prompt_per_second', 0):.0f} t/s | "
          f"output {t.get('predicted_n')} tok @ {t.get('predicted_per_second', 0):.1f} t/s")
    print(f"    {text[:160]}")


print(f"Target: {BASE}")
wall, r = ask("hello", key=None)
show("1. No key (expect HTTP 401)", wall, r)

for label, prompt in [("2. First call (may include wake-up)", "Explain what an API key is in two sentences."),
                      ("3. Warm, English", "Explain what an API key is in two sentences."),
                      ("4. Warm, Romanized", "mero exam sakiyo, aba k garne?"),
                      ("5. Warm, label", "Classify as complaint, question or praise, one word: 'mero order 3 din bhayo ajhai aayena'")]:
    show(label, *ask(prompt))

print("6. Three requests at once:")
results: list[tuple[float, dict | str]] = []
threads = [threading.Thread(target=lambda p=p: results.append(ask(p))) for p in
           ["Kathmandu ma ghumna jane ramro thau haru bhana na", "malai ali tension bhako cha, k garu?",
            "Tomorrow ko meeting cancel bhayo, team lai message lekhdeu."]]
t0 = time.time()
for th in threads:
    th.start()
for th in threads:
    th.join()
print(f"   all three done in {time.time() - t0:.1f}s")
for i, (w, r) in enumerate(results, 1):
    show(f"   6.{i}", w, r)

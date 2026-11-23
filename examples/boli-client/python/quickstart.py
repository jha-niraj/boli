"""Call the Boli API with the OpenAI Python SDK.

Usage (from examples/boli-client):
    export BOLI_API_KEY=boli_sk_...     # or put it in .env and `set -a; . ./.env; set +a`
    python3 python/quickstart.py
"""
import os
import sys
import time

from openai import APIError, APIStatusError, OpenAI

api_key = os.environ.get("BOLI_API_KEY")
if not api_key:
    sys.exit("BOLI_API_KEY is not set. Create a key at /keys in the Boli dashboard and put it in .env (see README).")
base_url = os.environ.get("BOLI_BASE_URL", "http://localhost:3100/v1")

client = OpenAI(api_key=api_key, base_url=base_url, max_retries=0)

try:
    t0 = time.time()
    res = client.chat.completions.create(
        model="boli-chat",
        messages=[{"role": "user", "content": "Namaste! Kathmandu ma ghumna jane ramro thau haru kun kun hun? Chhoto ma bhannus."}],
        max_tokens=200,
    )
    print(f"model: {res.model}  ({round((time.time() - t0) * 1000)} ms)\n")
    print(res.choices[0].message.content if res.choices else "(empty reply)")
    print("\nusage:", res.usage.model_dump_json() if res.usage else None)
except APIStatusError as e:
    retry = e.response.headers.get("retry-after")
    code = getattr(e, "code", None) or ""
    sys.exit(f"HTTP {e.status_code} {code}: {e.message}" + (f" (retry after {retry}s)" if retry else ""))
except APIError as e:
    sys.exit(f"Request failed: {e.message}")

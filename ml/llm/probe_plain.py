import json, sys, time, urllib.request
prompts = [
 ("en", "Explain what an API key is in two sentences."),
 ("rom", "mero exam sakiyo, aba k garne?"),
 ("mix", "Tomorrow ko meeting cancel bhayo, team lai ramro sanga inform garne message lekhdeu."),
 ("rom", "malai ali tension bhako cha, kam dherai cha. k garu?"),
 ("rom", "Kathmandu ma ghumna jane ramro thau haru bhana na"),
 ("mix", "Yo paragraph lai 1 line ma summarize gardeu: Hamro company le arko mahina dekhi naya leave policy lagu garne bhayo. Sabai staff le barsa ma 18 din paid leave paunechan, ra 5 din samma arko barsa carry forward garna milcha."),
 ("mix", "Classify this message as complaint, question, or praise. Reply with one word only: 'mero order 3 din bhayo ajhai aayena, k bhako ho?'"),
]
for tag, p in prompts:
    body = json.dumps({"messages":[{"role":"user","content":p}], "max_tokens": 400}).encode()
    t0 = time.time()
    r = json.load(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8080/v1/chat/completions", body, {"Content-Type":"application/json"}), timeout=300))
    wall = time.time() - t0
    m = r["choices"][0]["message"]; t = r.get("timings", {})
    print(f"=== [{tag}] {p}")
    print(f"wall {wall:.1f}s | prompt {t.get('prompt_n')} tok @ {t.get('prompt_per_second',0):.0f} t/s | output {t.get('predicted_n')} tok @ {t.get('predicted_per_second',0):.1f} t/s | reasoning_content: {'yes' if m.get('reasoning_content') else 'none'} | finish {r['choices'][0]['finish_reason']}")
    print(m.get("content","").strip()); print()

import json, time, urllib.request
SYS = ("You are Boli, a helpful assistant for people in Nepal. Always reply in the same language AND script as the user's "
       "latest message: English -> English; Romanized Nepali (Nepali in Latin letters) -> Romanized Nepali; a mix -> the same mix "
       "in Latin letters. Never switch to Devanagari unless the user writes in Devanagari. Keep replies short: at most 80 words "
       "unless asked for more. If you are not sure a fact is true, say so instead of guessing.")
prompts = ["mero exam sakiyo, aba k garne?",
 "malai ali tension bhako cha, kam dherai cha. k garu?",
 "Kathmandu ma ghumna jane ramro thau haru bhana na",
 "Tomorrow ko meeting cancel bhayo, team lai ramro sanga inform garne message lekhdeu."]
for p in prompts:
  for run in (1, 2):
    body = json.dumps({"messages":[{"role":"system","content":SYS},{"role":"user","content":p}], "max_tokens":300, "temperature":0.3}).encode()
    t0=time.time(); r=json.load(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8080/v1/chat/completions",body,{"Content-Type":"application/json"}),timeout=300)); w=time.time()-t0
    t=r["timings"]; print(f"=== {p}  [run {run}]  {w:.1f}s, {t['predicted_n']} tok @ {t['predicted_per_second']:.1f} t/s")
    print(r["choices"][0]["message"]["content"].strip()); print()

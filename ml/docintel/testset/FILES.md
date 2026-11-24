# Where the documents are

The downloaded originals (and the generated degraded pages) are NOT in git (owner, 2026-11-24). They live outside the
repo at `/Users/nirajjha/Documents/nirajjha/boli-docintel-files/testset/`, in the same folder layout as this one.
Every folder here keeps its `source.md` (URL, publisher, date fetched, SHA-256, licence note) and `results/`.

To re-run the test set, copy the originals back into place first:

```bash
rsync -a /Users/nirajjha/Documents/nirajjha/boli-docintel-files/testset/ ml/docintel/testset/
python3 ml/docintel/testset/run_testset.py
```

Or re-download each file from the URL in its `source.md` and check the SHA-256; `make_degraded.py` rebuilds the
synthetic-degraded pages.

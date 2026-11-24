"""Re-make the synthetic-degraded pages from the digital PDFs in this test set (needs Python PIL and pdftoppm).

  python3 ml/docintel/testset/make_degraded.py

Each variant: render one page with pdftoppm at a set dpi, then optionally greyscale, rotate, blur and save as JPEG at
a set quality. The answer key is that page's own text layer (`pdftotext -layout`). source.md is written by hand.
"""

import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent

# (source id, page, variant, dpi, jpeg quality or None, greyscale, rotate degrees, blur radius)
VARIANTS = [
    ("ird-taxday-press", 1, "dpi100", 100, None, False, 0, 0),
    ("ird-public-notice", 1, "dpi72", 72, None, False, 0, 0),
    ("mof-press-kartik30", 1, "jpeg25", 150, 25, False, 0, 0),
    ("neb-notice-3", 1, "rot-blur", 150, 85, False, 1.5, 1.0),
    ("ird-invoice-notice", 1, "dpi100-jpeg40", 100, 40, False, 0, 0),
    ("ird-britacof-press", 1, "dpi72-jpeg50", 72, 50, False, 0, 0),
    ("dohs-bipad-report", 1, "photocopy", 120, 35, True, -2.0, 0.8),
]


def main() -> None:
    for src, page, var, dpi, quality, grey, rot, blur in VARIANTS:
        pdf = HERE / "digital-pdf" / src / f"{src}.pdf"
        out_dir = HERE / "synthetic-degraded" / f"{src}-{var}"
        (out_dir / "results").mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp) / "p"
            subprocess.run(["pdftoppm", "-png", "-r", str(dpi), "-f", str(page), "-l", str(page), "-singlefile", str(pdf), str(base)], check=True)
            im = Image.open(f"{base}.png").convert("RGB")
        if grey:
            im = im.convert("L").convert("RGB")
        if rot:
            im = im.rotate(rot, resample=Image.BICUBIC, expand=True, fillcolor="white")
        if blur:
            im = im.filter(ImageFilter.GaussianBlur(blur))
        if quality:
            im.save(out_dir / f"{src}-{var}.jpg", "JPEG", quality=quality)
        else:
            im.save(out_dir / f"{src}-{var}.png", "PNG")
        key = subprocess.run(["pdftotext", "-layout", "-f", str(page), "-l", str(page), str(pdf), "-"], capture_output=True, text=True, check=True)
        (out_dir / "answer-key.txt").write_text(key.stdout)
        print(out_dir.name, im.size)


if __name__ == "__main__":
    main()

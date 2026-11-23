"""Episode transcript (Chance's edited-cut transcript with block times) to the page's JSON:
[{"seek": seconds, "text": paragraph}], each paragraph timed by word position within its
block (checked against the mp3 to within a few seconds on 2026-11-22).

Usage: python3 build_transcript.py transcript.txt total_seconds out.json
"""
import json, re, sys

src, total, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
raw = open(src, encoding="utf-8").read()
parts = re.split(r"^.*\((?:(\d+):)?(\d+):(\d+)(?:\.\d+)?\)\s*$", raw, flags=re.M)
blocks = []
for i in range(1, len(parts), 4):
    h, m, s_, body = parts[i], parts[i + 1], parts[i + 2], parts[i + 3]
    t = (int(h) * 3600 if h else 0) + int(m) * 60 + int(s_)
    blocks.append((t, [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]))
if blocks and blocks[0][0] < 3:
    blocks[0] = (0, blocks[0][1])

# words with their times
words = []  # (time, word, para_start)
for k, (t0, paras) in enumerate(blocks):
    t1 = blocks[k + 1][0] if k + 1 < len(blocks) else total
    n = sum(len(p.split()) for p in paras)
    w = 0
    for pi, p in enumerate(paras):
        for j, word in enumerate(p.split()):
            words.append((t0 + (t1 - t0) * w / max(n, 1), word, j == 0))
            w += 1

# Paragraphs: a break that falls mid-sentence (the transcriber's block edge) is joined,
# unless the paragraph is already long (captions with little punctuation would
# otherwise join into minutes long walls under one time; 2026-11-23).
LONG = 250
paras = []
cur = []
for t, word, start in words:
    ends = bool(cur) and re.search(r"[.?!\"”]$", cur[-1][1])
    if cur and ((start and (ends or len(cur) >= LONG)) or (ends and len(cur) >= LONG) or len(cur) >= 2 * LONG):
        paras.append(cur)
        cur = []
    if start and cur and word[:1].isupper() and word not in ("I", "NDE") and not word.startswith("I'") and not word.isupper():
        word = word[0].lower() + word[1:]
    cur.append((t, word))
if cur:
    paras.append(cur)

FIXES = [
    (r"\bInterverse\b", "InnerVerse"), (r"\bInnerverse\b", "InnerVerse"), (r"\bInterverse's\b", "InnerVerse's"),
    (r"\bChance Garten\b", "Chance Garton"),
    (r"\bEileen Day McCusick\b", "Eileen Day McKusick"), (r"\bMcCusick\b", "McKusick"),
    (r"\bbiofield tuning\.com\b", "biofieldtuning.com"),
    (r"\binterverse podcast\.com\b", "innerversepodcast.com"), (r"\binterversepodcast\.com\b", "innerversepodcast.com"),
    (r"\bcircle\.interversepodcast\.com/slash app\b", "circle.innerversepodcast.com/app"),
    (r"\bchance at interverse podcast dot com\b", "chance@innerversepodcast.com"),
    (r"\b[Cc]elfegio\b", "Solfeggio"), (r"\b[Ss]elf[f]?eg+io\b", "Solfeggio"),
    (r"\bpuzoelectric\b", "piezoelectric"), (r"\bre capitulating\b", "recapitulating"),
    (r"\bTuning the Human Biofield and Electric Body Electric Health\b", "Tuning the Human Biofield and Electric Body, Electric Health"),
    (r"\bpatience in her books\b", "patients in her books"),
]
outp = []
for p in paras:
    text = " ".join(w for _, w in p)
    for a, b in FIXES:
        text = re.sub(a, b, text)
    text = text[0].upper() + text[1:]
    outp.append({"seek": int(p[0][0]), "text": text})
assert not re.search("[–—]", json.dumps(outp, ensure_ascii=False))
json.dump(outp, open(out, "w"), ensure_ascii=False, indent=0)
print(len(outp), "paragraphs", sum(len(p["text"].split()) for p in outp), "words")

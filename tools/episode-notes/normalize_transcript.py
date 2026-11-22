"""Turn any house transcript (.txt) into the block format build_transcript.py reads.

Formats seen in the archive (2026-11-22):
  A. Riverside: "speaker-0 (00:01:51)" header line, then paragraphs. Already right.
  B. Acast pipeline: "(1:13:46.220) text..." at the start of each paragraph,
     already shifted onto the video clock. Rewritten as one block per paragraph.
Header lines before the first timestamp (title, "Source:", "Published") are dropped.
Riverside filler marks (the swung dash) are removed. Words are never changed here.

Usage: python3 normalize_transcript.py in.txt out.txt
"""
import re, sys

src, out = sys.argv[1], sys.argv[2]
raw = open(src, encoding="utf-8-sig").read().replace("\r\n", "\n")
raw = re.sub(r"\s*⁓\s*", " ", raw)          # swung dash filler mark
raw = re.sub(r"[ \t]+\n", "\n", raw)

inline = re.compile(r"^\((?:(\d+):)?(\d+):(\d+(?:\.\d+)?)\)\s+(\S.*)$", re.M)
header = re.compile(r"^.*\((?:\d+:)?\d+:\d+(?:\.\d+)?\)\s*$", re.M)

if header.search(raw):
    body = raw[header.search(raw).start():]
    fmt = "A"
elif inline.search(raw):
    blocks = []
    hits = list(inline.finditer(raw))
    for k, m in enumerate(hits):
        h, mi, s, _ = m.groups()
        # Everything up to the next stamp belongs to this paragraph, so a
        # paragraph that wraps onto more lines keeps all its words.
        end = hits[k + 1].start() if k + 1 < len(hits) else len(raw)
        text = raw[m.start(4):end].strip()
        sec = int(float(s))
        stamp = "%02d:%02d:%02d" % (int(h or 0), int(mi), sec)
        blocks.append("block (%s)\n%s\n" % (stamp, text))
    body = "\n".join(blocks)
    fmt = "B"
else:
    sys.exit("no timestamps found in " + src)

open(out, "w", encoding="utf-8").write(body)
print(fmt, len(header.findall(body)), "blocks")

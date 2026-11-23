"""Turn any house transcript (.txt) into the block format build_transcript.py reads.

Formats seen in the archive (2026-11-22):
  A. Riverside: "speaker-0 (00:01:51)" header line, then paragraphs. Already right.
  B. Acast pipeline: "(1:13:46.220) text..." at the start of each paragraph,
     already shifted onto the video clock. Rewritten as one block per paragraph.
  C. Line stamps (copied from YouTube's transcript view): "0:08 text" on every
     line, sometimes after a line number and a tab ("12\t40:07 text").
  D. Captions (.vtt or .srt): "00:00:08.000 --> 00:00:12.000" then the text.
  C and D are grouped into paragraphs of about 30 s, broken at a sentence end
  (60 s at most), on the clock of the video the captions came from.
Header lines before the first timestamp (title, "Source:", "Published") are dropped.
Riverside filler marks (the swung dash) and caption sound tags ([music],
[laughter], [applause] and the like) are removed. Words are never changed here.

Usage: python3 normalize_transcript.py in.txt out.txt
"""
import re, sys

src, out = sys.argv[1], sys.argv[2]
raw = open(src, encoding="utf-8-sig").read().replace("\r\n", "\n")
raw = re.sub(r"\s*⁓\s*", " ", raw)          # swung dash filler mark
raw = re.sub(r"[ \t]+\n", "\n", raw)

# Caption sound tags: one or two lowercase words in square brackets.
raw = re.sub(r" ?\[(?:[a-z]+)(?: [a-z]+)?\]", "", raw)

inline = re.compile(r"^\((?:(\d+):)?(\d+):(\d+(?:\.\d+)?)\)\s+(\S.*)$", re.M)
header = re.compile(r"^.*\((?:\d+:)?\d+:\d+(?:\.\d+)?\)\s*$", re.M)

def secs(stamp):
    n = 0
    for part in stamp.split(":"):
        n = n * 60 + int(part)
    return n


def grouped(lines):
    """Short timed lines to blocks of about 30 s, each broken at a sentence end."""
    blocks, start, buf = [], None, []
    for stamp, text in lines:
        t = secs(stamp)
        if buf and (t - start >= 60 or (t - start >= 30 and re.search(r"[.?!\"”]$", buf[-1]))):
            blocks.append((start, buf))
            buf = []
        if not buf:
            start = t
        buf.append(text)
    if buf:
        blocks.append((start, buf))
    return "\n".join("block (%02d:%02d:%02d)\n%s\n" % (b // 3600, b % 3600 // 60, b % 60, " ".join(ws))
                     for b, ws in blocks)


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
elif re.search(r"^\S*\d+:\d\d(?::\d\d)?[.,]\d+\s+-->\s", raw, re.M):
    cues, cur = [], None
    for line in raw.split("\n"):
        m = re.match(r"^\s*((?:\d+:)?\d+:\d\d)(?:[.,]\d+)?\s+-->\s", line)
        if m:
            cur = [m.group(1), []]
            cues.append(cur)
        elif cur is not None and line.strip() and not line.strip().isdigit():
            cur[1].append(re.sub(r"<[^>]+>", "", line).strip())
    lines, prev = [], None
    for stamp, texts in cues:
        for t in texts:
            if t and t != prev:       # rolling captions repeat the line before
                lines.append((stamp, t))
            prev = t if t else prev
    body = grouped(lines)
    fmt = "D"
elif re.search(r"^(?:\d+\t)?(?:\d+:)?\d+:\d\d\s+\S", raw, re.M):
    lines = []
    for line in raw.split("\n"):
        m = re.match(r"^(?:\d+\t)?((?:\d+:)?\d+:\d\d)\s+(\S.*)$", line)
        if m:
            lines.append((m.group(1), m.group(2).strip()))
        elif lines and line.strip():   # a line with no time of its own stays with the one before
            lines[-1] = (lines[-1][0], lines[-1][1] + " " + line.strip())
    body = grouped(lines)
    fmt = "C"
else:
    sys.exit("no timestamps found in " + src)

open(out, "w", encoding="utf-8").write(body)
print(fmt, len(header.findall(body)), "blocks")

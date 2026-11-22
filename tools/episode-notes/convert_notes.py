"""Turn Chance's episode notes (.docx) into the clean HTML fragment the episode page shows.

Usage: python3 convert_notes.py notes.docx slide-names.json image-base-url out.html
slide-names.json pairs each media file (in document order) with its uploaded name.
"""
import json, re, subprocess, sys
from bs4 import BeautifulSoup, NavigableString

docx, names_path, base, out = sys.argv[1:5]
html = subprocess.run(["pandoc", docx, "-t", "html", "--wrap=none"], capture_output=True, text=True, check=True).stdout

# Dashes in Chance's own notes and in the quoted books stay as written (Chance,
# 2026-11-22: the no-dash rule is for copy Claude writes, not for his text).

names = json.load(open(names_path))  # [[uploaded name, alt], ...] in document order
media_order = []
s = BeautifulSoup(html, "html.parser")
for img in s.find_all("img"):
    media_order.append(img["src"])
assert len(media_order) == len(names), (len(media_order), len(names))
srcmap = {}
for src, (name, alt) in zip(media_order, names):
    srcmap[src] = base + name.rsplit(".", 1)[0] + "/orig.jpg"

def clean_img(img):
    alt = img.get("alt", "")
    new = s.new_tag("img", src=srcmap[img["src"]], alt=alt)
    fig = s.new_tag("figure", attrs={"class": "ivn-fig"})
    fig.append(new)
    return fig

# drop underline wrappers and inline styles
for u in s.find_all("u"):
    u.unwrap()
for t in s.find_all(True):
    for a in ("style", "class"):
        if a in t.attrs:
            del t.attrs[a]

# first line "Chance Garton / InnerVerse"
first = s.find("p")
if first and "Chance Garton" in first.get_text() and len(first.get_text()) < 40:
    first.decompose()

# side-by-side tables become pairs
for table in s.find_all("table"):
    cells = table.find_all(["th", "td"])
    imgs = table.find_all("img")
    text_cells = [c for c in cells if not c.find("img") and c.get_text(strip=True)]
    if len(imgs) >= 2 and not text_cells:
        box = s.new_tag("div", attrs={"class": "ivn-duo"})
        for im in imgs:
            box.append(clean_img(im))
    else:
        box = s.new_tag("div", attrs={"class": "ivn-pair"})
        for im in imgs:
            box.append(clean_img(im))
        txt = s.new_tag("div", attrs={"class": "ivn-pair-text"})
        for c in text_cells:
            kids = list(c.children)
            if not c.find(["p", "h1", "h2", "h3", "h4"]):
                p = s.new_tag("p")
                for k in kids:
                    p.append(k.extract())
                txt.append(p)
            else:
                for k in kids:
                    if isinstance(k, NavigableString) and not k.strip():
                        continue
                    txt.append(k.extract())
        box.append(txt)
    table.replace_with(box)

# standalone images (pandoc wraps them in <p> or <figure>)
for img in s.find_all("img"):
    if img.find_parent("figure", attrs={"class": "ivn-fig"}):
        continue
    holder = img.find_parent(["figure", "p"])
    fig = clean_img(img)
    if holder is not None and holder.get_text(strip=True) == "":
        holder.replace_with(fig)
    else:
        img.replace_with(fig)

# headings: the page title is h1 and the section title h2, so the notes start at h3
for h in s.find_all(["h1", "h2", "h3", "h4"]):
    lvl = int(h.name[1])
    h.name = "h" + str(min(lvl + 2, 6))
    if h.get("id"):
        h["id"] = "n-" + h["id"]

# quotes: a paragraph opening with a quote mark starts a blockquote that runs to the
# paragraph closing it; a following "Eileen Day McKusick, ..." line becomes its cite.
def text(p):
    return p.get_text().strip()
paras = s.find_all("p")
i = 0
while i < len(paras):
    p = paras[i]
    if p.parent is None or p.find_parent("blockquote"):
        i += 1
        continue
    t = text(p)
    if t.startswith(("“", '"')):
        group = [p]
        j = i
        while not text(paras[j]).endswith(("”", '"')) and j + 1 < len(paras):
            j += 1
            group.append(paras[j])
        bq = s.new_tag("blockquote", attrs={"class": "ivn-quote"})
        p.insert_before(bq)
        for g in group:
            bq.append(g.extract())
        nxt = paras[j + 1] if j + 1 < len(paras) else None
        if nxt is not None and text(nxt).startswith("Eileen Day McKusick"):
            cite = s.new_tag("cite")
            for k in list(nxt.children):
                cite.append(k.extract())
            nxt.decompose()
            bq.append(cite)
            j += 1
        i = j + 1
        continue
    i += 1

for a in s.find_all("a"):
    a.attrs = {"href": a.get("href", ""), "target": "_blank", "rel": "noopener"}
for t in s.find_all(["colgroup", "thead", "tbody"]):
    t.unwrap()

out_html = str(s).strip()
out_html = re.sub(r"\n{2,}", "\n", out_html)
assert "<table" not in out_html
open(out, "w").write(out_html + "\n")
words = len(BeautifulSoup(out_html, "html.parser").get_text().split())
print("figures", out_html.count("<img"), "quotes", out_html.count("<blockquote"), "words", words)

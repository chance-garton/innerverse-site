"""Make a new dated wording file for the Biofield Anatomy page from the one in the image bucket, and put it in the bucket.

The wording never lives in this public repo. A change file (changes/<date>.json) names the wording file to start from, the new
file's name, the lines to change (by node, section and block; "first_sentence" replaces a line's first sentence and keeps the rest, so neither the old line nor
any line of the existing wording is written down here) and the SHA-256 the new file
must have. Larger changes use "ops" (see apply_op): new lines, sections, entries and search words, and additions to the end of a line,
each checked against a short fingerprint ("was": the first 12 hex digits of the SHA-256 of the line as it stands) instead of the old words. This script fetches the starting file from the bucket's public address, makes the changes, stops unless the result has
exactly that SHA-256, and uploads it under the new name. It never overwrites a file that is already there.

usage: python apply.py changes/2026-11-17.json [--dry] [--out file]     (--dry: build and check only, no upload; --out: also save the built file, never inside this repo)
Environment for the upload: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, IMAGE_BASE_URL.
"""
import hashlib, json, os, sys, urllib.request

fp = lambda s: hashlib.sha256(s.encode("utf-8")).hexdigest()[:12]


def apply_op(c, nodes, o, rule):
    """One change. Every op checks what it touches, so a second run on its own output, or a run on the wrong file, stops."""
    k = o["op"]
    def line(n):
        if o.get("section") is None: return nodes[n]["summary"]
        sec = [s for s in nodes[n]["sections"] if s["key"] == o["section"]]; assert len(sec) == 1, (n, o["section"])
        return sec[0]["blocks"][o["block"]]
    def tag(b): b["src"] = b.get("src", []) + [rule]
    if k in ("set_text", "end_with", "append_sentence", "replace_phrase"):
        b = line(o["node"]); assert fp(b["t"]) == o["was"], "not the expected line: %s %s" % (o["node"], o.get("section"))
        if k == "set_text": b["t"] = o["text"]
        elif k == "end_with": assert b["t"].endswith("."); b["t"] = b["t"][:-1] + o["text"]
        elif k == "append_sentence": b["t"] = b["t"] + " " + o["text"]
        else: assert b["t"].count(o["old"]) == 1; b["t"] = b["t"].replace(o["old"], o["new"])
        tag(b); return
    if k == "add_block":
        sec = [s for s in nodes[o["node"]]["sections"] if s["key"] == o["section"]]; assert len(sec) == 1, (o["node"], o["section"])
        assert len(sec[0]["blocks"]) == o["count_before"], "block count changed: %s %s" % (o["node"], o["section"])
        sec[0]["blocks"].append({"t": o["text"], "src": [rule]}); return
    if k == "add_section":
        n = nodes[o["node"]]; assert all(s["key"] != o["key"] for s in n["sections"]), (o["node"], o["key"])
        n["sections"].insert(o.get("at", len(n["sections"])), {"key": o["key"], "title": o["title"], "blocks": [{"t": t, "src": [rule]} for t in o["blocks"]]}); return
    if k == "add_node":
        new = o["entry"]; assert new["id"] not in nodes, new["id"]
        new["summary"]["src"] = [rule]
        for s in new["sections"]: s["blocks"] = [{"t": t, "src": [rule]} for t in s["blocks"]]
        ids = [x["id"] for x in c["nodes"]]; c["nodes"].insert(ids.index(o["after"]) + 1, new); nodes[new["id"]] = new; return
    if k == "add_search":
        s = nodes[o["node"]]["search"]; assert not set(o["words"]) & set(s), (o["node"], o["words"]); s.extend(o["words"]); return
    if k == "set_power_note":
        p = [x for x in c["powers"] if x["name"] == o["power"]]; assert len(p) == 1 and not p[0].get("note"), o["power"]
        p[0]["note"] = o["text"]; return
    raise ValueError("unknown op " + k)

FOLDER = "biofield-anatomy/"
HEAD, TAIL = "window.__BFA_CONTENT=", ";"


def main():
    change = json.load(open(sys.argv[1], encoding="utf-8")); dry = "--dry" in sys.argv
    base = os.environ.get("IMAGE_BASE_URL", "https://images.innerversepodcast.com").rstrip("/")
    get = lambda name: urllib.request.urlopen(urllib.request.Request(base + "/" + FOLDER + name, headers={"User-Agent": "innerverse-wording"}), timeout=60)
    raw = get(change["from"]).read().decode("utf-8")
    assert raw.startswith(HEAD) and raw.endswith(TAIL), "the starting file is not a wording file"
    c = json.loads(raw[len(HEAD):-len(TAIL)])
    nodes = {n["id"]: n for n in c["nodes"]}
    for e in change.get("edits", []):
        sec = [s for s in nodes[e["node"]]["sections"] if s["key"] == e["section"]]
        assert len(sec) == 1, "section not found: %s / %s" % (e["node"], e["section"])
        b = sec[0]["blocks"][e["block"]]
        if "first_sentence" in e: cut = b["t"].index(". ") + 1; b["t"] = e["first_sentence"] + b["t"][cut:]   # the rest of the line stays as it is in the bucket
        else: b["t"] = e["text"]
        if e.get("src_add"): b["src"] = b.get("src", []) + [e["src_add"]]
    for o in change.get("ops", []): apply_op(c, nodes, o, change["rule"])
    out = (HEAD + json.dumps(c, ensure_ascii=False, separators=(",", ":")) + TAIL).encode("utf-8")
    sha = hashlib.sha256(out).hexdigest()
    print("built %s: %d bytes, SHA-256 %s" % (change["to"], len(out), sha))
    assert sha == change["sha256"], "the result is not the approved file (expected %s)" % change["sha256"]
    assert chr(0x2014) not in out.decode("utf-8") and chr(0x2013) not in out.decode("utf-8"), "a dash got into the wording"
    if "--out" in sys.argv: open(sys.argv[sys.argv.index("--out") + 1], "wb").write(out); print("saved a copy for a preview build")
    if dry: print("dry run: nothing uploaded"); return
    import boto3
    from botocore.exceptions import ClientError
    s3 = boto3.client("s3", endpoint_url="https://%s.r2.cloudflarestorage.com" % os.environ["R2_ACCOUNT_ID"], aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                      aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"], region_name="auto")
    bucket, key = os.environ["R2_BUCKET"], FOLDER + change["to"]
    try:
        s3.head_object(Bucket=bucket, Key=key)
        there = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
        assert there == out, "a different file is already in the bucket under %s: nothing was changed" % key
        print("already in the bucket, identical: nothing to do"); return
    except ClientError as err:
        if err.response["Error"]["Code"] not in ("404", "NoSuchKey", "NotFound"): raise
    s3.put_object(Bucket=bucket, Key=key, Body=out, ContentType="text/javascript")
    # read it back through the public address; a fresh query string each time, because the address may still be answering
    # "not found" from before the upload for a few minutes (that false alarm failed the first run, 2026-11-17, after a good upload)
    import time
    url = base + "/" + FOLDER + change["to"]; back = None
    for i in range(6):
        try: back = urllib.request.urlopen(urllib.request.Request(url + "?check=%d" % time.time(), headers={"User-Agent": "innerverse-wording"}), timeout=60).read(); break
        except Exception: time.sleep(10)
    assert back == out, "the file in the bucket does not read back the same"
    print("uploaded and read back the same from %s/%s%s" % (base, FOLDER, change["to"]))


main()

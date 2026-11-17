"""Make a new dated wording file for the Biofield Anatomy page from the one in the image bucket, and put it in the bucket.

The wording never lives in this public repo. A change file (changes/<date>.json) names the wording file to start from, the new
file's name, the lines to change (by node, section and block; "first_sentence" replaces a line's first sentence and keeps the rest, so neither the old line nor
any line of the existing wording is written down here) and the SHA-256 the new file
must have. This script fetches the starting file from the bucket's public address, makes the changes, stops unless the result has
exactly that SHA-256, and uploads it under the new name. It never overwrites a file that is already there.

usage: python apply.py changes/2026-11-17.json [--dry]     (--dry: build and check only, no upload)
Environment for the upload: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, IMAGE_BASE_URL.
"""
import hashlib, json, os, sys, urllib.request

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
    for e in change["edits"]:
        sec = [s for s in nodes[e["node"]]["sections"] if s["key"] == e["section"]]
        assert len(sec) == 1, "section not found: %s / %s" % (e["node"], e["section"])
        b = sec[0]["blocks"][e["block"]]
        if "first_sentence" in e: cut = b["t"].index(". ") + 1; b["t"] = e["first_sentence"] + b["t"][cut:]   # the rest of the line stays as it is in the bucket
        else: b["t"] = e["text"]
        if e.get("src_add"): b["src"] = b.get("src", []) + [e["src_add"]]
    out = (HEAD + json.dumps(c, ensure_ascii=False, separators=(",", ":")) + TAIL).encode("utf-8")
    sha = hashlib.sha256(out).hexdigest()
    print("built %s: %d bytes, SHA-256 %s" % (change["to"], len(out), sha))
    assert sha == change["sha256"], "the result is not the approved file (expected %s)" % change["sha256"]
    assert chr(0x2014) not in out.decode("utf-8") and chr(0x2013) not in out.decode("utf-8"), "a dash got into the wording"
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

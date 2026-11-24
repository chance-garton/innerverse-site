#!/usr/bin/env python3
"""Where speech starts in the first minutes of an episode's FREE audio file
(Whisper base.en, word timestamps). Used where no caption track exists:
the members' video shares the free audio's clock from 0:00, and a free
video's clock is the audio's minus Audio Offset Seconds.

usage: whisper_first_speech.py targets.json out.json [worker_index n_workers]
targets.json: [{"slug", "audio": <free audio mp3 address>}, ...]
Members' value = start - 3; free value = start - Audio Offset Seconds - 3; only when over 20.
"""
import json, os, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel

T = json.load(open(sys.argv[1])); OUT = sys.argv[2]
wi, wn = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (0, 1)
res = json.load(open(OUT)) if os.path.exists(OUT) else {}
m = WhisperModel('base.en', device='cpu', compute_type='int8', cpu_threads=2)
SECS = 360

for i, t in enumerate(T):
    if i % wn != wi or t['slug'] in res:
        continue
    tmp = '/tmp/w_%d.mp3' % wi
    subprocess.run(['curl', '-sS', '-L', '-r', '0-14000000', '-o', tmp, t['audio']], timeout=180)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-t', str(SECS), '-i', tmp, '-vn', '-ac', '1', '-ar', '16000',
                          '-f', 's16le', '-'], capture_output=True).stdout
    if len(raw) < 16000 * 2 * 30:
        res[t['slug']] = {'err': 'audio fetch/decode failed (%d bytes)' % len(raw)}
    else:
        a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
        segs, _ = m.transcribe(a, language='en', beam_size=1, vad_filter=True, word_timestamps=True)
        ev, cur, t0 = [], [], None
        for s in segs:
            for w in (s.words or []):
                if t0 is None: t0 = w.start
                cur.append(w.word)
                if w.end - t0 >= 3:
                    ev.append([round(t0, 2), ''.join(cur).strip()]); cur, t0 = [], None
        if cur: ev.append([round(t0, 2), ''.join(cur).strip()])
        res[t['slug']] = {'ev': ev, 'secs': len(a) / 16000}
    json.dump(res, open(OUT + '.%d' % wi, 'w'))
    print(wi, t['slug'], flush=True)
print('done', wi)

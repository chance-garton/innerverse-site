# Writes the built preview (viewer/dist) as one self-contained HTML file that opens straight from disk:
# no server and no host page around it, so F11 gives a clean full screen. Usage: python3 single_file.py <viewer dir> <out.html>
# The file carries the real wording when the build did, so it never goes into this public repo.
import sys
V, OUT = sys.argv[1], sys.argv[2]
rd = lambda n: open(V + '/dist/' + n, encoding='utf-8').read().replace('</script', '<\\/script')
h = open(V + '/dist/index.html', encoding='utf-8').read()
for tag, n, kind in [('<script src="content.js"></script>', 'content.js', ''), ('<script src="model.js"></script>', 'model.js', ''),
                     ('<script type="module" src="viewer.js"></script>', 'viewer.js', ' type="module"')]:
    assert h.count(tag) == 1, tag
    h = h.replace(tag, '<script' + kind + '>' + rd(n) + '</script>')
open(OUT, 'w', encoding='utf-8').write(h)
print('wrote', OUT, len(h))

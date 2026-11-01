#!/usr/bin/env python3
"""Build Foldlight Studio from src/.
   dist/          multi-file site for static hosting (same layout as the Codex site)
   artifact.html  single-file page for the claude.ai live page (three.js r160 from cdnjs)"""
import os, re, shutil
here = os.path.dirname(os.path.abspath(__file__))
S = lambda *p: os.path.join(here, 'src', *p)
THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js'
html = open(S('index.html'), encoding='utf-8').read()

dist = os.path.join(here, 'dist'); os.makedirs(dist, exist_ok=True)
for f in os.listdir(os.path.join(here, 'src')):
    shutil.copyfile(S(f), os.path.join(dist, f))
if os.path.exists(os.path.join(here, 'three.min.js')):
    shutil.copyfile(os.path.join(here, 'three.min.js'), os.path.join(dist, 'three.min.js'))

css = open(S('style.css'), encoding='utf-8').read()
body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
scripts = re.findall(r'<script src="([^"?]+)(?:\?[^"]*)?"></script>', body)
body = re.sub(r'<script src="[^"]+"></script>', '', body)
parts = []
for src in scripts:
    if src == 'three.min.js': parts.append('<script src="' + THREE_CDN + '"></script>')
    else: parts.append('<script>\n' + open(S(src), encoding='utf-8').read() + '\n</script>')
page = '<title>Foldlight Studio</title>\n<style>\n' + css + '\nbody{background:var(--bg)}\n</style>\n' + body.strip() + '\n' + '\n'.join(parts) + '\n'
open(os.path.join(here, 'artifact.html'), 'w', encoding='utf-8').write(page)
print('built dist/ and artifact.html', len(page), 'scripts:', scripts)

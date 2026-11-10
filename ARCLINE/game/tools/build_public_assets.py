"""Keep former character URLs usable after integrating the cast into the main site."""
from pathlib import Path

root = Path(__file__).resolve().parents[2]
canonical = 'https://bittrove88.github.io/ARCLINE/#machines'

def redirect(target):
    return f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ARCLINE — 10機の相棒</title>
<meta http-equiv="refresh" content="0;url={target}">
<link rel="canonical" href="{canonical}">
<meta name="robots" content="noindex,follow">
<meta name="theme-color" content="#112f3a">
<style>body{{margin:0;padding:12vh 7vw;background:#112f3a;color:#fffdf6;font:16px/1.8 system-ui,sans-serif}}main{{max-width:700px;margin:auto}}h1{{font-size:clamp(28px,5vw,48px)}}a{{color:#f18a51}}</style>
</head><body><main><p>ARCLINE / 10 MACHINES</p><h1>好きな一撃で、相棒を選べ。</h1>
<p>10機の紹介は、公式サイトに統合しました。</p><p>The 10 machines now share a home on the main site.</p>
<a href="{target}">相棒たちを見る / Meet the machines →</a></main></body></html>
'''

(root / 'characters/index.html').write_text(redirect('../#machines'))
# Downloaded copies still point to the online destination; the separate offline UI is retired.
(root / 'characters/ARCLINE_Characters_Preview.html').write_text(redirect(canonical))
print('Built compatibility redirects for the integrated machine showcase')

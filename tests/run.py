"""Runs the browser tests in headless Edge (or Chrome) and prints PASS/FAIL lines.

    python tests/run.py              # all tests
    python tests/run.py marble       # only tests/marble.test.js

Each *.test.js is injected into a copy of index.html (pointing at the real app files), builds its own fillable PDF with
pdf-lib, drops it into the app and writes its results into <pre id="out">. Pages are generated in tests/_out/.
"""
import os, re, subprocess, sys, pathlib

HERE = pathlib.Path(__file__).resolve().parent
APP = HERE.parent
OUT = HERE / '_out'
BROWSERS = [r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe', r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
            r'C:\Program Files\Google\Chrome\Application\chrome.exe']


def page_for(test):
    base = APP.as_uri() + '/'
    html = (APP / 'index.html').read_text(encoding='utf-8')
    html = re.sub(r'(src|href)="(?!http)([^"]+\.(?:js|css))"', lambda m: f'{m.group(1)}="{base}{m.group(2)}"', html)
    js = test.read_text(encoding='utf-8').replace('__MODE__', 'test')
    page = OUT / (test.stem.replace('.test', '') + '.html')
    page.write_text(html.replace('</body>', f'<script>{js}</script></body>'), encoding='utf-8')
    return page


def run(test, browser):
    page = page_for(test)
    for attempt in range(2):  # now and then the browser hands back an empty page; try once more
        dom = subprocess.run([browser, '--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--virtual-time-budget=60000',
                              '--dump-dom', page.as_uri()], capture_output=True, text=True, encoding='utf-8', timeout=300).stdout
        m = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
        if m:
            break
    lines = (m.group(1) if m else 'ERROR no output').replace('&gt;', '>').replace('&lt;', '<').replace('&amp;', '&').splitlines()
    passed = sum(l.startswith('PASS') for l in lines)
    bad = [l for l in lines if not l.startswith('PASS')]
    print(f'{test.name}: {passed} passed' + (f', {len(bad)} other lines:' if bad else ''))
    for l in bad:
        print('   ', l)
    return not any(l.startswith(('FAIL', 'ERROR')) for l in bad)


if __name__ == '__main__':
    browser = next((b for b in BROWSERS if os.path.exists(b)), None)
    if not browser:
        sys.exit('No Edge or Chrome found; add its path to BROWSERS in tests/run.py')
    OUT.mkdir(exist_ok=True)
    tests = sorted(HERE.glob('*.test.js'))
    if len(sys.argv) > 1:
        tests = [t for t in tests if any(a in t.name for a in sys.argv[1:])]
    ok = all([run(t, browser) for t in tests])
    sys.exit(0 if ok else 1)

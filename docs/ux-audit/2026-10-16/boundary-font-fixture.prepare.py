"""Restore the public immutable font fixture into the already registered task tmp.
Run explicitly before boundary-font-registration.browser.mjs; no font binary is shipped.
The first run source URL/block/SHA are preserved in the formal boundary receipt.
"""
import hashlib,json,pathlib,urllib.request
root=pathlib.Path(__file__).parent
receipt=json.loads((root/'evidence/boundary-font-registration.json').read_text())
meta=receipt['fontSource']
assert meta['fontURL'].startswith('https://fonts.gstatic.com/s/notoserif/v33/')
body=urllib.request.urlopen(meta['fontURL'],timeout=20).read()
assert hashlib.sha256(body).hexdigest()==meta['fontSHA256'],'Public fixture changed; do not silently replace the experiment input'
tmp=pathlib.Path('/private/tmp/ai-test-blog-ux-20261016.d8VJru')
assert tmp.is_dir(),'Register the task artifact directory before running; do not create arbitrary tmp'
(tmp/'boundary-font.woff2').write_bytes(body)
(tmp/'boundary-font.css').write_text(meta['block'])
(tmp/'boundary-font-source.json').write_text(json.dumps(meta,indent=2)+'\n')
print(json.dumps({'bytes':len(body),'sha256':meta['fontSHA256']}))

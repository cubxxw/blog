import argparse, base64, datetime, hashlib, json, re, urllib.parse, urllib.request
from html.parser import HTMLParser
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--base', required=True)
p.add_argument('--name', required=True)
p.add_argument('--deploy', required=True)
p.add_argument('--source', required=True)
a = p.parse_args()
root = Path(__file__).parent

def fetch(url):
    with urllib.request.urlopen(url, timeout=25) as response:
        assert urllib.parse.urlsplit(response.url).netloc == urllib.parse.urlsplit(url).netloc, 'cross-origin redirect breaks deployment binding'
        return response.read()

def platform():
    data = json.loads(fetch('https://api.netlify.com/api/v1/deploys/' + a.deploy))
    assert data['site_id'] == '10e9c8fc-0201-4d41-9240-5c35f10ee952'
    result = {k: data.get(k) for k in ['id', 'commit_ref', 'context', 'state', 'published_at']}
    base = urllib.parse.urlsplit(a.base)
    assert base.scheme == 'https'
    if base.netloc == 'cubxxw.com':
        assert data['context'] == 'production'
        site = json.loads(fetch('https://api.netlify.com/api/v1/sites/cubxxw.netlify.app'))
        current = site['published_deploy']
        assert site['id'] == data['site_id']
        assert current['id'] == a.deploy and current['commit_ref'] == a.source and current['state'] == 'ready', 'production alias moved'
        result['currentPublished'] = {k: current.get(k) for k in ['id', 'commit_ref', 'state']}
    else:
        assert base.netloc == a.deploy + '--cubxxw.netlify.app', 'use the immutable deploy permalink'
    return result

class Scripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.items = []
    def handle_starttag(self, tag, attrs):
        if tag == 'script':
            self.items.append(dict(attrs))

def digest(body):
    return hashlib.sha256(body).hexdigest()

def verify(body, integrity):
    assert integrity == 'sha256-' + base64.b64encode(hashlib.sha256(body).digest()).decode(), 'SRI mismatch'

before = platform()
assert before['commit_ref'] == a.source and before['state'] == 'ready', before
rows = []
for language, route in [('en', '/'), ('zh', '/zh/')]:
    page_url = urllib.parse.urljoin(a.base, route)
    html = fetch(page_url)
    parser = Scripts()
    parser.feed(html.decode())
    candidates = [s for s in parser.items if 'search-bootstrap' in s.get('src', '')]
    assert len(candidates) == 1
    tag = candidates[0]
    bootstrap_url = urllib.parse.urljoin(page_url, tag['src'])
    bootstrap = fetch(bootstrap_url)
    verify(bootstrap, tag['integrity'])
    text = bootstrap.decode()
    sources = re.findall(r'["\'](/js/search-controller\.[a-f0-9]{64}\.js)["\']', text)
    integrities = re.findall(r'["\'](sha256-[A-Za-z0-9+/]+={0,2})["\']', text)
    assert len(sources) == len(integrities) == 1, 'controller URL/SRI absent or ambiguous'
    src, integrity = sources[0], integrities[0]
    controller_url = urllib.parse.urljoin(page_url, src)
    controller = fetch(controller_url)
    verify(controller, integrity)
    assert digest(controller) in urllib.parse.urlsplit(controller_url).path
    matches = re.findall(r'threshold:(?:0?\.3),includeMatches:(?:!1|false),minMatchCharLength:1,ignoreLocation:(?:!0|true),findAllMatches:(?:!0|true)', controller.decode())
    assert len(matches) == 1, 'candidate search options absent or ambiguous'
    (root / (a.name + '-controller-' + language + '.js')).write_bytes(controller)
    (root / (a.name + '-bootstrap-' + language + '.js')).write_bytes(bootstrap)
    rows.append({'language': language, 'page': page_url, 'htmlSHA256': digest(html), 'bootstrapURL': bootstrap_url, 'bootstrapSHA256': digest(bootstrap), 'bootstrapSRI': tag['integrity'], 'controllerURL': controller_url, 'controllerSHA256': digest(controller), 'controllerBytes': len(controller), 'controllerSRI': integrity, 'searchOptions': matches[0]})
after = platform()
assert before == after
assert rows[0]['controllerSHA256'] == rows[1]['controllerSHA256']
result = {'at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'before': before, 'after': after, 'rows': rows, 'SRIValid': True, 'limits': 'Actual HTTP decoded identity bodies and SRI/source readback; not compression, speed, INP, full-site equivalence, or browser acceptance.'}
(root / (a.name + '-search-release.json')).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False))

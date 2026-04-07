#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List

ROOT = Path('/home/smile/data/blog/yak-soul-core')
RAW = ROOT / 'raw' / 'monthly_notes'
CHUNKS = ROOT / 'chunks' / 'monthly_notes'
WIKI = ROOT / 'wiki'
STATE = ROOT / 'state' / 'ingest-state.json'

MONTH_FILES = [
    '2025-03-thought-notes.md','2025-04-thought-notes.md','2025-05-thought-notes.md','2025-06-thought-notes.md',
    '2025-07-thought-notes.md','2025-08-thought-notes.md','2025-09-thought-notes.md','2025-10-thought-notes.md',
    '2025-11-thought-notes.md','2025-12-thought-notes.md','2026-01-thought-notes.md','2026-02-thought-notes.md','2026-03-thought-notes.md'
]

DATE_RE = re.compile(r'^(20\d{2}-\d{2})')
HEADING_RE = re.compile(r'^(#{2,3})\s+(.*)$')
FRONT_MATTER_RE = re.compile(r'^---\n.*?\n---\n', re.S)
TERM_RE = re.compile(r'[\u4e00-\u9fffA-Za-z][\u4e00-\u9fffA-Za-z0-9\-+/ ]{1,30}')
STOPWORDS = {
    'date','draft','author','authors','title','summary','description','weight','showtoc','tocopen','cover','image','images','slug','tags','categories',
    'false','true','null','item','posts','post','page','pages','home','archives','search','content','selected notes of the month',
    '思考笔记','月度精选','按日期归档','daily notes archive','selected notes','the month','source','chunk','raw','markdown',
    '我们','你们','他们','这个','那个','一种','以及','如果','因为','所以','就是','可以','需要','已经','不是','没有','一个','一些','这些','那些',
    '为例','任务','但就','use','chat','cove','ontermlist','image','author'
}
BLACKLIST_EXACT = {'2025-03-01','2025-04-01','2025-05-01','2025-06-01','2025-07-01','2025-08-01','2025-09-01','2025-10-01','2025-11-01','2025-12-01','2026-01-01','2026-02-01','2026-03-01'}
TENSION_MARKERS = [' vs ', 'VS', '矛盾', '张力', '冲突', '两难', '取舍', '平衡', '边界', '还是', '与', '之间']
CONCEPT_HINTS = ['主义','方法','系统','模型','策略','原则','能力','关系','结构','工作流','心智','架构','主权','范式','秩序','自由','质量','速度','成长','独立开发','创造','叙事']
ENTITY_HINTS = ['OpenClaw','Cursor','Claude','Codex','OpenAI','GitHub','Manus','DeepSeek','拉萨','深圳','杭州','日本','清迈','奈良','京都','AI','Web3']

@dataclass
class Chunk:
    id: str
    month: str
    source_file: str
    title: str
    heading_path: List[str]
    content: str
    raw_markdown: str
    position: int


def month_of(name: str) -> str:
    m = DATE_RE.match(name)
    return m.group(1) if m else name


def strip_front_matter(text: str) -> str:
    return FRONT_MATTER_RE.sub('', text, count=1)


def normalize_term(term: str) -> str:
    t = term.strip()
    t = re.sub(r'\s+', ' ', t)
    return t


def good_term(term: str) -> bool:
    t = normalize_term(term)
    tl = t.lower()
    if not t or tl in STOPWORDS or t in BLACKLIST_EXACT:
        return False
    if len(t) < 2:
        return False
    if re.fullmatch(r'[0-9\- ]+', t):
        return False
    if re.match(r'^(20\d{2}[\-/]?)', t):
        return False
    if tl.startswith(('2025','2026')):
        return False
    if tl in {'hi there', 'selected', 'notes', 'month'}:
        return False
    return True


def split_markdown(text: str):
    text = strip_front_matter(text)
    lines = text.splitlines()
    chunks = []
    current_h2 = None
    current_h3 = None
    buf = []
    pos = 0

    def flush():
        nonlocal pos, buf
        body = '\n'.join(buf).strip()
        if body:
            pos += 1
            heading = [x for x in [current_h2, current_h3] if x]
            title = ' / '.join(heading) if heading else f'chunk-{pos}'
            chunks.append((pos, heading, body))
        buf = []

    for line in lines:
        m = HEADING_RE.match(line)
        if m:
            level = len(m.group(1))
            heading_text = m.group(2).strip()
            flush()
            if level == 2:
                current_h2 = heading_text
                current_h3 = None
            elif level == 3:
                current_h3 = heading_text
            continue
        buf.append(line)
    flush()

    if not chunks:
        paras = [p.strip() for p in text.split('\n\n') if p.strip()]
        chunks = []
        for i, p in enumerate(paras, 1):
            chunks.append((i, [], p))
    return chunks


def ensure_dirs():
    CHUNKS.mkdir(parents=True, exist_ok=True)
    for d in ['entities', 'concepts', 'tensions', 'timelines']:
        (WIKI / d).mkdir(parents=True, exist_ok=True)
    (ROOT / 'state').mkdir(parents=True, exist_ok=True)


def build_chunks():
    all_chunks = []
    for name in MONTH_FILES:
        p = RAW / name
        if not p.exists():
            continue
        text = p.read_text(encoding='utf-8', errors='ignore')
        month = month_of(name)
        monthly_chunks = []
        for pos, heading_path, body in split_markdown(text):
            cid = f'{month}-{pos:02d}'
            title = ' / '.join(heading_path) if heading_path else cid
            chunk = Chunk(
                id=cid,
                month=month,
                source_file=name,
                title=title,
                heading_path=heading_path,
                content=body,
                raw_markdown=body,
                position=pos,
            )
            monthly_chunks.append(chunk)
            all_chunks.append(chunk)
        out = CHUNKS / f'{month}.jsonl'
        with out.open('w', encoding='utf-8') as f:
            for chunk in monthly_chunks:
                f.write(json.dumps(asdict(chunk), ensure_ascii=False) + '\n')
    return all_chunks


def slugify(text: str) -> str:
    s = re.sub(r'[^\w\u4e00-\u9fff-]+', '-', text).strip('-').lower()
    return s[:80] or 'item'


def extract_terms(text: str):
    terms = []
    for m in TERM_RE.findall(text):
        t = normalize_term(m)
        if not good_term(t):
            continue
        terms.append(t)
    seen = []
    for t in terms:
        if t not in seen:
            seen.append(t)
    return seen[:30]


def classify_term(term: str):
    if term in ENTITY_HINTS:
        return 'entity'
    if any(marker in term for marker in ['公司','项目','社区','城市','工具']) or re.search(r'[A-Z]{2,}|[A-Z][a-z]+', term):
        return 'entity'
    if any(h in term for h in CONCEPT_HINTS):
        return 'concept'
    if len(term) <= 4 and re.fullmatch(r'[\u4e00-\u9fff]{2,4}', term):
        return 'entity'
    return 'concept'


def extract_tensions(chunks: List[Chunk]):
    out = []
    for c in chunks:
        title = c.title + ' ' + c.content[:200]
        if any(m in title for m in TENSION_MARKERS):
            out.append(c)
    return out


def write_index(chunks: List[Chunk]):
    months = {}
    for c in chunks:
        months.setdefault(c.month, []).append(c)

    index_lines = ['# Yak Soul Core Index', '', '## Monthly Sources', '']
    for month in sorted(months):
        index_lines.append(f'### {month}')
        index_lines.append(f'- Source: `raw/monthly_notes/{month}-thought-notes.md`')
        index_lines.append(f'- Chunk file: `chunks/monthly_notes/{month}.jsonl`')
        index_lines.append(f'- Chunk count: {len(months[month])}')
        index_lines.append('')

    log_lines = ['# Ingest Log', '']
    log_lines.append(f'- Processed months: {len(months)}')
    log_lines.append(f'- Total chunks: {len(chunks)}')

    timeline_lines = ['# Monthly Thought Notes Timeline', '']
    for month in sorted(months):
        first_titles = [c.title for c in months[month][:5]]
        timeline_lines.append(f'## {month}')
        timeline_lines.append(f'- Chunk count: {len(months[month])}')
        timeline_lines.append('- First topics:')
        for t in first_titles:
            timeline_lines.append(f'  - {t}')
        timeline_lines.append('')

    (WIKI / 'index.md').write_text('\n'.join(index_lines), encoding='utf-8')
    (WIKI / 'log.md').write_text('\n'.join(log_lines), encoding='utf-8')
    (WIKI / 'timelines' / 'monthly-thought-notes.md').write_text('\n'.join(timeline_lines), encoding='utf-8')


def write_concepts_and_entities(chunks: List[Chunk]):
    concept_map = defaultdict(list)
    entity_map = defaultdict(list)
    freq = Counter()
    for c in chunks:
        terms = extract_terms(c.title + '\n' + c.content[:500])
        for term in terms:
            freq[term] += 1
            kind = classify_term(term)
            if kind == 'entity':
                entity_map[term].append(c)
            else:
                concept_map[term].append(c)

    strong_concepts = [t for t, n in freq.items() if n >= 3 and t in concept_map]
    strong_entities = [t for t, n in freq.items() if n >= 2 and t in entity_map]

    for term in sorted(strong_concepts)[:120]:
        refs = concept_map[term]
        lines = [f'# [[{term}]]', '', '## 来源片段', '']
        if len(refs) < 4:
            lines.append('- weak signal')
            lines.append('')
        for c in refs[:10]:
            lines.append(f"> [{c.month} | chunk: {c.id}] 思考源自 [[raw/monthly_notes/{c.source_file[:-3]}]]")
            lines.append(f'- 标题：{c.title}')
            lines.append(f'- 摘录：{c.content[:180].replace(chr(10), " ")}')
            lines.append('')
        (WIKI / 'concepts' / f'{slugify(term)}.md').write_text('\n'.join(lines), encoding='utf-8')

    for term in sorted(strong_entities)[:120]:
        refs = entity_map[term]
        lines = [f'# [[{term}]]', '', '## 来源片段', '']
        if len(refs) < 3:
            lines.append('- weak signal')
            lines.append('')
        for c in refs[:10]:
            lines.append(f"> [{c.month} | chunk: {c.id}] 思考源自 [[raw/monthly_notes/{c.source_file[:-3]}]]")
            lines.append(f'- 标题：{c.title}')
            lines.append(f'- 摘录：{c.content[:180].replace(chr(10), " ")}')
            lines.append('')
        (WIKI / 'entities' / f'{slugify(term)}.md').write_text('\n'.join(lines), encoding='utf-8')


def write_tensions(chunks: List[Chunk]):
    tensions = extract_tensions(chunks)
    index = ['# Tensions Index', '']
    count = 0
    for c in tensions[:160]:
        name = c.title or c.id
        if not good_term(name.replace(' / ', ' ')):
            continue
        file = slugify(name) + '.md'
        lines = [f'# [[{name}]]', '', '## 观测', '']
        lines.append(f"> [{c.month} | chunk: {c.id}] 思考源自 [[raw/monthly_notes/{c.source_file[:-3]}]]")
        lines.append(f'- 标题：{c.title}')
        lines.append(f'- 内容：{c.content[:260].replace(chr(10), " ")}')
        lines.append('')
        lines.append(f'> ⚠️ 认知演进 (Cognitive Shift) [{c.month}]')
        lines.append('> - 原有范式：待后续补充')
        lines.append('> - 当前触动：从当前块可见存在认知张力或取舍')
        lines.append('> - 演化动因：待后续补充')
        lines.append(f'> - 出处链接： [[raw/monthly_notes/{c.source_file[:-3]}]]')
        (WIKI / 'tensions' / file).write_text('\n'.join(lines), encoding='utf-8')
        index.append(f'- [[{name}]]')
        count += 1
    (WIKI / 'tensions' / 'index.md').write_text('\n'.join(index), encoding='utf-8')
    return count


def write_state(chunks: List[Chunk], tension_count: int):
    state = {
        'months': len({c.month for c in chunks}),
        'chunks': len(chunks),
        'chunk_files': sorted([p.name for p in CHUNKS.glob('*.jsonl')]),
        'concept_pages': len(list((WIKI / 'concepts').glob('*.md'))),
        'entity_pages': len(list((WIKI / 'entities').glob('*.md'))),
        'tension_pages': tension_count,
    }
    STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    ensure_dirs()
    chunks = build_chunks()
    write_index(chunks)
    write_concepts_and_entities(chunks)
    tension_count = write_tensions(chunks)
    write_state(chunks, tension_count)
    print(f'processed_months={len({c.month for c in chunks})}')
    print(f'total_chunks={len(chunks)}')
    print(f'concept_pages={len(list((WIKI / "concepts").glob("*.md")))}')
    print(f'entity_pages={len(list((WIKI / "entities").glob("*.md")))}')
    print(f'tension_pages={tension_count}')


if __name__ == '__main__':
    main()

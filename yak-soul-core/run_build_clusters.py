#!/usr/bin/env python3
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

ROOT = Path('/home/smile/data/blog/yak-soul-core')
CAND = ROOT / 'state' / 'candidate-chunks.jsonl'
OUT = ROOT / 'state' / 'concept-clusters.json'
WIKI = ROOT / 'wiki'

CLUSTERS = {
    'ai-native-workflow': {
        'title': 'AI Native Workflow',
        'keywords': ['AI', 'agent', 'OpenClaw', 'Claude', 'Cursor', 'Codex', '工作流', 'context', '模型'],
        'kind': 'concept'
    },
    'indie-hacker-method': {
        'title': '独立开发方法论',
        'keywords': ['独立开发', '创业', '产品', '方法论', '迭代', 'MVP', '验证'],
        'kind': 'concept'
    },
    'identity-and-another-self': {
        'title': '自我建模与 Another Self',
        'keywords': ['自我', '身份', '人格', '我是谁', 'Another Self', '主体性'],
        'kind': 'concept'
    },
    'truth-performance-tension': {
        'title': '真实 vs 表演',
        'keywords': ['真实', '表演', '求真', '伪装', '人设', '关系'],
        'kind': 'tension'
    },
    'freedom-order-tension': {
        'title': '自由 vs 秩序',
        'keywords': ['自由', '秩序', '规则', '控制', '边界', '结构'],
        'kind': 'tension'
    },
    'love-boundary-tension': {
        'title': '亲密关系中的边界',
        'keywords': ['关系', '爱', '亲密', '边界', '陪伴', '婚姻', '孤独'],
        'kind': 'tension'
    },
    'nomad-life-system': {
        'title': '游牧生活系统',
        'keywords': ['旅居', '旅行', '徒步', '城市', '拉萨', '日本', '清迈'],
        'kind': 'concept'
    },
    'meaning-and-growth': {
        'title': '意义、成长与创造',
        'keywords': ['意义', '成长', '创造', '痛苦', '幸福', '存在'],
        'kind': 'concept'
    },
    'system-thinking-blindspot': {
        'title': '系统化思维的优势与盲区',
        'keywords': ['系统', '结构', '模型', '理性', '体验', '盲区'],
        'kind': 'tension'
    },
    'china-world-observation': {
        'title': '中国与世界的观察框架',
        'keywords': ['中国', '美国', '日本', '社会', '文化', '国家', '文明'],
        'kind': 'concept'
    },
}


def load_rows():
    rows = []
    for line in CAND.read_text(encoding='utf-8').splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def score_cluster(row, keywords):
    text = (row.get('title','') + ' ' + row.get('summary','')).lower()
    return sum(1 for kw in keywords if kw.lower() in text)


def main():
    rows = load_rows()
    result = {}
    for cid, conf in CLUSTERS.items():
        matched = []
        for row in rows:
            score = score_cluster(row, conf['keywords'])
            if score > 0:
                matched.append((score, row))
        matched.sort(key=lambda x: (-x[0], -x[1].get('score_total', 0), x[1]['chunk_id']))
        result[cid] = {
            'title': conf['title'],
            'kind': conf['kind'],
            'keywords': conf['keywords'],
            'count': len(matched),
            'top_chunks': [m[1] for m in matched[:25]],
        }

    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')

    index = ['# Core Concept Clusters', '']
    for cid, cluster in result.items():
        index.append(f"## {cluster['title']}")
        index.append(f"- kind: {cluster['kind']}")
        index.append(f"- matched chunks: {cluster['count']}")
        index.append(f"- keywords: {', '.join(cluster['keywords'])}")
        index.append('')
        for row in cluster['top_chunks'][:8]:
            index.append(f"- [{row['month']} | {row['chunk_id']}] {row['title']}")
        index.append('')

    (WIKI / 'index-clusters.md').write_text('\n'.join(index), encoding='utf-8')
    print(f'clusters={len(result)}')
    for cid, cluster in result.items():
        print(f"{cid}={cluster['count']}")


if __name__ == '__main__':
    main()

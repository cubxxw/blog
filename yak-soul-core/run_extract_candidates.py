#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path('/home/smile/data/blog/yak-soul-core')
CHUNKS = ROOT / 'chunks' / 'monthly_notes'
OUT = ROOT / 'state' / 'candidate-chunks.jsonl'

KEYWORDS = {
    'identity': ['自我', '身份', '我是谁', '认同', '人格', '存在', '意义'],
    'ai': ['AI', '大模型', 'agent', 'Claude', 'Cursor', 'OpenClaw', 'Codex', '模型'],
    'work': ['工作', '创业', '独立开发', '产品', '项目', '公司', '效率', '创造'],
    'relationship': ['关系', '爱', '亲密', '孤独', '陪伴', '边界', '婚姻', '朋友'],
    'life': ['旅行', '徒步', '生活', '城市', '拉萨', '日本', '清迈', '旅居'],
    'belief': ['秩序', '自由', '成长', '意义', '理性', '感性', '幸福', '痛苦'],
}

TENSION_HINTS = ['vs', '还是', '平衡', '矛盾', '冲突', '张力', '边界', '取舍', '一边', '另一边']
CONCEPT_HINTS = ['主义', '方法', '系统', '模型', '策略', '原则', '关系', '结构', '工作流', '心智', '架构', '秩序', '自由', '成长', '独立开发']
ENTITY_HINTS = ['OpenClaw', 'Claude', 'Cursor', 'Codex', 'GitHub', 'DeepSeek', 'Manus', '拉萨', '杭州', '深圳', '日本', '清迈']


def score_text(text: str):
    scores = {}
    for label, words in KEYWORDS.items():
        scores[label] = sum(1 for w in words if w.lower() in text.lower())
    return scores


def extract_candidates(title: str, content: str):
    txt = f"{title}\n{content[:600]}"
    concepts = [w for w in CONCEPT_HINTS if w in txt]
    entities = [w for w in ENTITY_HINTS if w in txt]
    tensions = [w for w in TENSION_HINTS if w in txt]
    return sorted(set(concepts)), sorted(set(entities)), sorted(set(tensions))


def main():
    rows = []
    for file in sorted(CHUNKS.glob('*.jsonl')):
        for line in file.read_text(encoding='utf-8').splitlines():
            if not line.strip():
                continue
            obj = json.loads(line)
            title = obj.get('title', '')
            content = obj.get('content', '')
            scores = score_text(title + '\n' + content)
            concepts, entities, tensions = extract_candidates(title, content)
            score_total = sum(scores.values()) + len(concepts) + len(entities) + len(tensions)
            if score_total < 2:
                continue
            row = {
                'chunk_id': obj['id'],
                'month': obj['month'],
                'source_file': obj['source_file'],
                'title': title,
                'score_total': score_total,
                'signals': {k: v for k, v in scores.items() if v > 0},
                'candidate_concepts': concepts,
                'candidate_entities': entities,
                'candidate_tensions': tensions,
                'summary': content[:240].replace('\n', ' '),
            }
            rows.append(row)

    rows.sort(key=lambda x: (-x['score_total'], x['chunk_id']))
    with OUT.open('w', encoding='utf-8') as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + '\n')
    print(f'candidate_chunks={len(rows)}')
    print(f'output={OUT}')


if __name__ == '__main__':
    main()

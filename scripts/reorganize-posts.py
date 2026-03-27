#!/usr/bin/env python3
"""
Reorganize blog posts into AI Technology and Growth sections.
Moves articles to appropriate directories based on their categories.
"""

import os
import re
from pathlib import Path

# Configuration
BLOG_ROOT = Path("/Users/xiongxinwei/data/cubxxw/blog/content")
ZH_POSTS = BLOG_ROOT / "zh" / "posts"
EN_POSTS = BLOG_ROOT / "en" / "posts"
ZH_AI_TECH = BLOG_ROOT / "zh" / "ai-technology" / "posts"
ZH_GROWTH = BLOG_ROOT / "zh" / "growth" / "posts"
EN_AI_TECH = BLOG_ROOT / "en" / "ai-technology" / "posts"
EN_GROWTH = BLOG_ROOT / "en" / "growth" / "posts"

# Category mappings
AI_TECH_CATEGORIES = [
    "AI Technology",
    "技术 (Technology)",
    "技术",
    "AI Open Source",
    "开发 (Development)",
    "Kubernetes",
]

GROWTH_CATEGORIES = [
    "Growth",
    "成长 (Growth)",
    "成长",
    "个人成长 (Personal Development)",
    "旅行 (Travel)",
]

def extract_categories(content):
    """Extract categories from markdown frontmatter."""
    # Match categories in frontmatter
    categories_match = re.search(r'categories:\s*\n?\s*[-\[\]]?\s*(.+?)(?=\n\w|\n---|$)', content, re.DOTALL)
    if not categories_match:
        # Try single line format
        categories_match = re.search(r'categories:\s*\[(.+?)\]', content)
        if categories_match:
            cats = categories_match.group(1)
            return [c.strip().strip("'\"") for c in cats.split(',')]
        return []

    cats_text = categories_match.group(1).strip()

    # Handle list format
    if cats_text.startswith('['):
        # Single line array
        cats = cats_text.strip('[]')
        return [c.strip().strip("'\"") for c in cats.split(',')]
    else:
        # Multi-line format
        categories = []
        for line in cats_text.split('\n'):
            line = line.strip()
            if line.startswith('-'):
                cat = line[1:].strip().strip("'\"")
                if cat:
                    categories.append(cat)
            elif line and not line.startswith('#'):
                # Handle inline array continuation
                if ':' in line and 'categories' not in line:
                    break
        return categories

def determine_destination(categories, is_zh=True):
    """Determine destination directory based on categories."""
    for cat in categories:
        if any(ai_cat in cat for ai_cat in ["技术", "AI", "开发", "Kubernetes", "Technology"]):
            return "ai-technology"
        if any(growth_cat in cat for growth_cat in ["成长", "Growth", "旅行", "Travel", "Personal"]):
            return "growth"

    # Default: check title and description for keywords
    return None

def process_file(file_path, is_zh=True):
    """Process a single markdown file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    categories = extract_categories(content)
    destination = determine_destination(categories, is_zh)

    if not destination:
        # Try to infer from filename or content
        filename = file_path.stem.lower()
        if any(kw in filename for kw in ['kubernetes', 'go', 'ai', 'devops', 'tech', 'openim', 'argo', 'gitops']):
            destination = "ai-technology"
        elif any(kw in filename for kw in ['travel', 'growth', 'annual', 'review', 'flow', 'gtd', 'metacognitive']):
            destination = "growth"
        else:
            print(f"  ⚠️  Could not determine category for: {file_path.name}")
            return None

    # Determine target directory
    if is_zh:
        if destination == "ai-technology":
            target_dir = ZH_AI_TECH
        else:
            target_dir = ZH_GROWTH
    else:
        if destination == "ai-technology":
            target_dir = EN_AI_TECH
        else:
            target_dir = EN_GROWTH

    # Move file
    target_path = target_dir / file_path.name
    if target_path.exists():
        print(f"  ⚠️  File already exists: {target_path.name}")
        return None

    os.rename(file_path, target_path)
    print(f"  ✓  Moved {file_path.name} → {destination}/")

    return destination

def main():
    print("=" * 60)
    print("Blog Post Reorganization Script")
    print("=" * 60)

    # Create target directories if they don't exist
    for dir_path in [ZH_AI_TECH, ZH_GROWTH, EN_AI_TECH, EN_GROWTH]:
        dir_path.mkdir(parents=True, exist_ok=True)

    print("\n📁 Processing Chinese posts...")
    zh_moved = {"ai-technology": 0, "growth": 0}
    for md_file in ZH_POSTS.glob("*.md"):
        result = process_file(md_file, is_zh=True)
        if result:
            zh_moved[result] += 1

    print(f"\n  Chinese posts moved: {sum(zh_moved.values())}")
    print(f"    - AI Technology: {zh_moved['ai-technology']}")
    print(f"    - Growth: {zh_moved['growth']}")

    print("\n📁 Processing English posts...")
    en_moved = {"ai-technology": 0, "growth": 0}
    for md_file in EN_POSTS.glob("*.md"):
        result = process_file(md_file, is_zh=False)
        if result:
            en_moved[result] += 1

    print(f"\n  English posts moved: {sum(en_moved.values())}")
    print(f"    - AI Technology: {en_moved['ai-technology']}")
    print(f"    - Growth: {en_moved['growth']}")

    print("\n" + "=" * 60)
    print("✅ Reorganization complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()

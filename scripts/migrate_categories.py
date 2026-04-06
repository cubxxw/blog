#!/usr/bin/env python3
"""
Category Migration Script
Migrates old category names to the new unified 4-category architecture
Version: 2.0.0
"""

import os
import re
import shutil
from datetime import datetime
from pathlib import Path

# Configuration
CONTENT_DIR = "content"
BACKUP_DIR = f".backup/categories-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
REPORT_FILE = f"task-logs/category-migration-{datetime.now().strftime('%Y%m%d-%H%M%S')}.log"

# Category mappings (old -> new)
CATEGORY_MAP = {
    # English mappings
    "Development": "AI & Technology",
    "Technology": "AI & Technology",
    "AI Open Source": "Projects",
    "Growth": "Growth",
    "Travel": "Travel",
    "Projects": "Projects",
    "Personal Development": "Growth",

    # Chinese mappings
    "成长 (Growth)": "Growth",
    "技术 (Technology)": "AI & Technology",
    "开发 (Development)": "AI & Technology",
    "AI 开源 (AI Open Source)": "Projects",
    "旅行 (Travel)": "Travel",
    "个人成长 (Personal Development)": "Growth",
    "生活与教育 (Living & Education)": "Growth",
}

# Counters
count_map = {key: 0 for key in CATEGORY_MAP}
total_files = 0
total_changes = 0
changed_files = []


def create_backup(file_path: str) -> None:
    """Create a backup of the file."""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    shutil.copy2(file_path, f"{BACKUP_DIR}/{os.path.basename(file_path)}")


def update_categories_in_content(content: str, file_path: str) -> tuple[str, bool]:
    """Update categories in content string."""
    global total_changes

    changed = False

    for old_cat, new_cat in CATEGORY_MAP.items():
        # Escape special regex characters in category name
        old_escaped = re.escape(old_cat)

        # Pattern 1: categories: ["Category Name"] or categories: ['Category Name']
        pattern1 = rf'categories:\s*\[["\']?{old_escaped}["\']?\]'
        if re.search(pattern1, content):
            replacement = f'categories: ["{new_cat}"]'
            content = re.sub(pattern1, replacement, content)
            count_map[old_cat] += 1
            total_changes += 1
            changed = True

        # Pattern 2: categories:\n  - Category Name (list format)
        pattern2 = rf'^\s*-\s*["\']?{old_escaped}["\']?\s*$'
        if re.search(pattern2, content, re.MULTILINE):
            replacement = f"  - {new_cat}"
            content = re.sub(pattern2, replacement, content, flags=re.MULTILINE)
            count_map[old_cat] += 1
            total_changes += 1
            changed = True

        # Pattern 3: categories: Category Name (single value without brackets)
        pattern3 = rf'^categories:\s*{old_escaped}\s*$'
        if re.search(pattern3, content, re.MULTILINE):
            replacement = f"categories: {new_cat}"
            content = re.sub(pattern3, replacement, content, flags=re.MULTILINE)
            count_map[old_cat] += 1
            total_changes += 1
            changed = True

    return content, changed


def process_file(file_path: str) -> bool:
    """Process a single markdown file."""
    global total_files

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        new_content, changed = update_categories_in_content(content, file_path)

        if changed:
            create_backup(file_path)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            total_files += 1
            changed_files.append(file_path)
            print(f"✓ Updated: {file_path}")
            return True

        return False
    except Exception as e:
        print(f"✗ Error processing {file_path}: {e}")
        return False


def main():
    print("======================================")
    print("Category Migration Script v2.0.0")
    print("======================================\n")

    # Create backup directory
    os.makedirs(BACKUP_DIR, exist_ok=True)
    print(f"📦 Created backup directory: {BACKUP_DIR}\n")

    # Create task-logs directory if it doesn't exist
    os.makedirs("task-logs", exist_ok=True)

    print("🔍 Scanning content files...\n")

    # Find all markdown files in content directory
    for root, dirs, files in os.walk(CONTENT_DIR):
        for file in files:
            if file.endswith('.md'):
                file_path = os.path.join(root, file)
                process_file(file_path)

    # Print summary
    print("\n======================================")
    print("Migration Summary")
    print("======================================\n")
    print(f"\033[0;32mTotal files updated:\033[0m {total_files}")
    print(f"\033[1;33mTotal changes made:\033[0m {total_changes}\n")
    print("Changes by category:\n")

    # Print migration report
    print(f"{'Old Category':<35} -> {'New Category':<20} | Count")
    print("-" * 70)

    for old_cat, new_cat in CATEGORY_MAP.items():
        count = count_map[old_cat]
        if count > 0:
            print(f"{old_cat:<35} -> {new_cat:<20} | {count}")

    print("\n======================================\n")

    # Write report to file
    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write("Category Migration Report\n")
        f.write("=========================\n")
        f.write(f"Date: {datetime.now()}\n")
        f.write("Version: 2.0.0\n\n")
        f.write("Summary:\n")
        f.write(f"Total files updated: {total_files}\n")
        f.write(f"Total changes made: {total_changes}\n\n")
        f.write("Changes by category:\n")
        for old_cat, new_cat in CATEGORY_MAP.items():
            count = count_map[old_cat]
            if count > 0:
                f.write(f"{old_cat} -> {new_cat}: {count}\n")
        f.write(f"\nBackup location: {BACKUP_DIR}\n")
        f.write(f"\nChanged files:\n")
        for file_path in changed_files:
            f.write(f"  - {file_path}\n")

    print(f"\033[0;32m✓\033[0m Report saved to: {REPORT_FILE}")
    print(f"\033[1;33m⚠\033[0m  Backup saved to: {BACKUP_DIR}\n")
    print("Next steps:")
    print("1. Review the changes with: git diff")
    print("2. Restore backups if needed")
    print("3. Commit changes: git add . && git commit -m 'Migrate to unified category architecture'")
    print()


if __name__ == "__main__":
    main()

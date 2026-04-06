#!/bin/bash

# Category Migration Script
# Migrates old category names to the new unified 4-category architecture
# Version: 2.0.0

set -e

CONTENT_DIR="content"
BACKUP_DIR=".backup/categories-$(date +%Y%m%d-%H%M%S)"
REPORT_FILE="task-logs/category-migration-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "Category Migration Script v2.0.0"
echo "======================================"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"
echo "📦 Created backup directory: $BACKUP_DIR"

# Category mappings (old -> new)
declare -A CATEGORY_MAP=(
    # English mappings
    ["Development"]="AI & Technology"
    ["Technology"]="AI & Technology"
    ["AI Open Source"]="Projects"
    ["Growth"]="Growth"
    ["Travel"]="Travel"
    ["Projects"]="Projects"
    ["Personal Development"]="Growth"

    # Chinese mappings
    ["成长 (Growth)"]="Growth"
    ["技术 (Technology)"]="AI & Technology"
    ["开发 (Development)"]="AI & Technology"
    ["AI 开源 (AI Open Source)"]="Projects"
    ["旅行 (Travel)"]="Travel"
    ["个人成长 (Personal Development)"]="Growth"
    ["生活与教育 (Living & Education)"]="Growth"
)

# Initialize counters
declare -A COUNT_MAP
for key in "${!CATEGORY_MAP[@]}"; do
    COUNT_MAP[$key]=0
done

TOTAL_FILES=0
TOTAL_CHANGES=0

# Function to update categories in a file
update_categories() {
    local file="$1"
    local changed=0

    for old_cat in "${!CATEGORY_MAP[@]}"; do
        local new_cat="${CATEGORY_MAP[$old_cat]}"

        # Check if file contains the old category
        if grep -q "$old_cat" "$file"; then
            # Backup the file
            cp "$file" "$BACKUP_DIR/"

            # Replace category - handle different formats
            # Format 1: categories: ["Category Name"]
            sed -i "s/categories: \[\"$old_cat\"\]/categories: [\"$new_cat\"]/g" "$file"
            # Format 2: categories: ['Category Name']
            sed -i "s/categories: \['$old_cat'\]/categories: ['$new']/g" "$file"
            # Format 3: categories:\n  - Category Name
            sed -i "s/^\s*-\s*$old_cat\s*$/  - $new_cat/g" "$file"
            # Format 4: categories: Category Name (without quotes)
            sed -i "s/categories: $old_cat$/categories: $new_cat/g" "$file"

            COUNT_MAP[$old_cat]=$((${COUNT_MAP[$old_cat]} + 1))
            changed=1
            ((TOTAL_CHANGES++))
        fi
    done

    if [ $changed -eq 1 ]; then
        ((TOTAL_FILES++))
        echo -e "${GREEN}✓${NC} Updated: $file"
    fi
}

echo ""
echo "🔍 Scanning content files..."
echo ""

# Find all markdown files in content directory
while IFS= read -r -d '' file; do
    update_categories "$file"
done < <(find "$CONTENT_DIR" -type f -name "*.md" -print0)

echo ""
echo "======================================"
echo "Migration Summary"
echo "======================================"
echo ""
echo -e "${GREEN}Total files updated:${NC} $TOTAL_FILES"
echo -e "${YELLOW}Total changes made:${NC} $TOTAL_CHANGES"
echo ""
echo "Changes by category:"
echo ""

# Print migration report
printf "%-35s -> %-20s | %s\n" "Old Category" "New Category" "Count"
echo "---------------------------------------------------------------"

for old_cat in "${!CATEGORY_MAP[@]}"; do
    new_cat="${CATEGORY_MAP[$old_cat]}"
    count=${COUNT_MAP[$old_cat]}
    if [ $count -gt 0 ]; then
        printf "%-35s -> %-20s | %d\n" "$old_cat" "$new_cat" "$count"
    fi
done

echo ""
echo "======================================"
echo ""

# Write report to file
{
    echo "Category Migration Report"
    echo "========================="
    echo "Date: $(date)"
    echo "Version: 2.0.0"
    echo ""
    echo "Summary:"
    echo "Total files updated: $TOTAL_FILES"
    echo "Total changes made: $TOTAL_CHANGES"
    echo ""
    echo "Changes by category:"
    for old_cat in "${!CATEGORY_MAP[@]}"; do
        new_cat="${CATEGORY_MAP[$old_cat]}"
        count=${COUNT_MAP[$old_cat]}
        if [ $count -gt 0 ]; then
            echo "$old_cat -> $new_cat: $count"
        fi
    done
    echo ""
    echo "Backup location: $BACKUP_DIR"
} > "$REPORT_FILE"

echo -e "${GREEN}✓${NC} Report saved to: $REPORT_FILE"
echo -e "${YELLOW}⚠${NC}  Backup saved to: $BACKUP_DIR"
echo ""
echo "Next steps:"
echo "1. Review the changes with: git diff"
echo "2. Restore backups if needed: cp $BACKUP_DIR/* <file>"
echo "3. Commit changes: git add . && git commit -m 'Migrate to unified category architecture'"
echo ""

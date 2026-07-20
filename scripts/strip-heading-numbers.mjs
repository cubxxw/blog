#!/usr/bin/env node
// Strip academic-style leading numbering from Markdown headings.
//
// Removes ONLY a numbering token that sits at the very start of a heading's
// text (right after the `#`s), e.g.:
//   "## 一、失眠"        -> "## 失眠"
//   "### 2.1 情感"       -> "### 情感"
//   "## 3. 部署"         -> "## 部署"
//   "## 二） 两套系统"    -> "## 两套系统"
//
// It deliberately does NOT touch:
//   - "### 幻觉一：..."   (number is inside a word, not a leading token)
//   - "## 引子：..."      (no number)
//   - "# 2026 年 2 月..." (a year/date, guarded below)
//   - fenced code blocks  (``` ... ``` are skipped)
//   - thought-notes files (their "### 12." are semantic entry numbers)
//
// Usage:
//   node scripts/strip-heading-numbers.mjs                 # dry-run, all files
//   node scripts/strip-heading-numbers.mjs --write         # apply
//   node scripts/strip-heading-numbers.mjs --file <path>   # scope to one file
//   node scripts/strip-heading-numbers.mjs --file <path> --write

import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const args = process.argv.slice(2)
const WRITE = args.includes('--write')
const fileArg = (() => {
  const i = args.indexOf('--file')
  return i >= 0 ? args[i + 1] : null
})()

// Files whose heading numbers are semantic (list-entry indices), not chapters,
// plus docs/meta files that are not articles.
const SKIP_SUBSTR = ['thought-notes', 'CLAUDE.md', 'README', 'CATEGORIES']

// Leading-numbering matchers, tried in order. Each captures the numbering to
// drop in group 1 and the remaining heading text in group 2.
// Applied only to the text AFTER the `#`s and their following space.
const NUM_PATTERNS = [
  // Arabic multi/single level: "2.1 ", "3.4.5 ", "1. ", "1、", "1）", "1) "
  /^(\d+(?:\.\d+)*[.、）)]?\s+)(\S.*)$/,
  //  ^ requires a separator+space OR a dotted form; "12" alone won't match (needs trailing sep/space)
  // Chinese numerals up to 二十九: "一、", "十二、", "二） ", "三. "
  /^((?:十|二十|三十)?[一二三四五六七八九十]{1,2}[、.．）)]\s*)(\S.*)$/,
]

// Guard: never treat a 4-digit year like "2026" as numbering.
function isYearish(s) {
  return /^\d{4}(\s|年|$)/.test(s)
}

function stripLeadingNumber(text) {
  if (isYearish(text)) return null
  for (const re of NUM_PATTERNS) {
    const m = text.match(re)
    if (m && m[2] && m[2].trim()) {
      // Don't strip if what's left is empty or itself just punctuation.
      return m[2]
    }
  }
  return null
}

function processContent(src) {
  const lines = src.split('\n')
  let inFence = false
  let changes = []
  const out = lines.map((line, idx) => {
    const fence = line.match(/^\s*(```|~~~)/)
    if (fence) { inFence = !inFence; return line }
    if (inFence) return line
    const h = line.match(/^(#{1,6})(\s+)(.*)$/)
    if (!h) return line
    const [, hashes, sp, text] = h
    const stripped = stripLeadingNumber(text)
    if (stripped == null || stripped === text) return line
    changes.push({ line: idx + 1, from: `${hashes} ${text}`, to: `${hashes} ${stripped}` })
    return `${hashes}${sp}${stripped}`
  })
  return { text: out.join('\n'), changes }
}

function listFiles() {
  if (fileArg) return [fileArg]
  const out = execSync(
    `grep -rlE "^#{1,6}[[:space:]]" content --include="*.md"`,
    { encoding: 'utf8' }
  )
  return out.split('\n').filter(Boolean)
}

let totalFiles = 0, totalChanges = 0
for (const f of listFiles()) {
  if (SKIP_SUBSTR.some((s) => f.includes(s))) continue
  const src = readFileSync(f, 'utf8')
  const { text, changes } = processContent(src)
  if (!changes.length) continue
  totalFiles++
  totalChanges += changes.length
  console.log(`\n── ${f}  (${changes.length})`)
  for (const c of changes) console.log(`   ${c.line}: ${c.from}\n        → ${c.to}`)
  if (WRITE && text !== src) writeFileSync(f, text)
}

console.log(`\n${WRITE ? 'APPLIED' : 'DRY-RUN'} · ${totalChanges} heading(s) across ${totalFiles} file(s)`)
if (!WRITE) console.log('Re-run with --write to apply.')

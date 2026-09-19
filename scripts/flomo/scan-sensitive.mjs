#!/usr/bin/env node
/**
 * 敏感内容扫描：在把 flomo 内容写进公开博客之前，先找出可能伤害他人或
 * 暴露自己隐私的条目，供人工复核。
 *
 * 用法：
 *   node scripts/flomo/scan-sensitive.mjs [--memos .flomo/memos.json] [--json .flomo/sensitive.json]
 *
 * 只做候选筛出，不做自动判断。最终是否删除，记录在 scripts/flomo/redactions.json。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const memosPath = resolve(flag('--memos', '.flomo/memos.json'));
const jsonOut = resolve(flag('--json', '.flomo/sensitive.json'));
const { memos } = JSON.parse(readFileSync(memosPath, 'utf8'));

const RULES = [
  ['credential', /(sk-[A-Za-z0-9]{16,}|gh[pous]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{12,}|Bearer\s+[A-Za-z0-9._-]{20,})/],
  ['credential', /(密码|口令|私钥|api[_ ]?key|secret|token)\s*[:：=]\s*\S{6,}/i],
  ['credential', /(身份证|护照号|银行卡号|信用卡|卡号|CVV|验证码|短信验证码)/],
  ['credential', /\b\d{17}[\dXx]\b/],
  ['credential', /\b\d{16,19}\b/],
  ['contact', /(微信号|QQ号|微信\s*[:：]|电话\s*[:：]|手机号|联系方式)\s*\S{4,}/],
  ['contact', /\b1[3-9]\d{9}\b/],
  ['contact', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ['money', /(余额|存款|月薪|工资|年薪|收入|负债|欠款|贷款|花呗|信用卡账单|房贷|房租)\D{0,12}\d{2,}/],
  ['money', /\d+\s*(万|块钱|元|美元|美金|usd|USD)\b/],
  ['health', /(抑郁症|焦虑症|双相|精神病|确诊|吃药|手术|住院|自杀|自残|割腕|服药)/],
  ['thirdparty', /(他女朋友|她男朋友|我前女友|我前任|前任|我姐|我妹|我妈|我爸|他老婆|她老公).{0,40}(骂|傻|烂|垃圾|人品|绿茶|渣|虚伪|骗|出轨|分手)/],
  ['thirdparty', /(领导|老板|同事|合伙人|投资人|客户|老师|同学|导师).{0,30}(sb|傻逼|垃圾|骗子|虚伪|无能|坑|坑人|白嫖|耍我|骗我)/],
  ['thirdparty', /(这个女孩|那个女孩|这个男生|那个男生|有个朋友|一个朋友|某个人).{0,40}(恶心|讨厌|受不了|崩溃|烦|作|矫情)/],
  ['sexual', /(做爱|性行为|裸照|开房|约炮|sex|性欲|高潮)/],
  ['legal', /(翻墙|偷税|避税|走私|赌博|赌场|行贿|受贿|回扣|刷单|灰产|黑产|洗钱)/],
  ['legal', /(违反劳动法|违法|被告|起诉|律师函|仲裁)/],
  ['identity', /(身份证号|户籍|家庭住址|住址|门牌|小区\s*\d|具体地址)/],
  ['private-chat', /(截屏|截图).{0,20}(聊天|对话|私聊|群)/],
];

const findings = [];
for (const memo of memos) {
  const hits = [];
  for (const [label, re] of RULES) {
    const m = memo.text.match(re);
    if (m) hits.push({ label, match: m[0].slice(0, 60) });
  }
  if (hits.length) {
    findings.push({
      key: memo.key,
      date: memo.date,
      time: memo.time,
      month: memo.month,
      labels: [...new Set(hits.map((h) => h.label))],
      hits,
      excerpt: memo.text.slice(0, 200).replace(/\n+/g, ' / '),
    });
  }
}

const byLabel = {};
for (const f of findings) for (const l of f.labels) byLabel[l] = (byLabel[l] ?? 0) + 1;

mkdirSync(dirname(jsonOut), { recursive: true });
writeFileSync(jsonOut, `${JSON.stringify({ findings, byLabel }, null, 1)}\n`);

console.log(`scanned ${memos.length} memos, flagged ${findings.length}`);
for (const [label, count] of Object.entries(byLabel).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${label.padEnd(14)} ${count}`);
}
console.log(`report -> ${jsonOut}`);

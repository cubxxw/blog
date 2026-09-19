#!/usr/bin/env node
/**
 * 把 flomo memo 按「大方向」分类，并生成月度思考笔记。
 *
 * 用法：
 *   node scripts/flomo/build-notes.mjs                    # 生成到 .flomo/out/，不碰 content/
 *   node scripts/flomo/build-notes.mjs --write            # 同时写入 content/zh/growth/posts/
 *   node scripts/flomo/build-notes.mjs --emit-chunks      # 额外导出英文翻译工作单元
 *   node scripts/flomo/build-notes.mjs --months 2025-11   # 只处理指定月份
 *
 * 设计要点：
 * - 分类是「脚本先定结构，人来审」：标签命中优先，其次关键词打分，最后落到「日常与其他」。
 * - 标题优先复用已发布文章里已经写好的标题（按 date+time 精确匹配），新条目才由脚本生成。
 * - 覆盖优先：每条 memo 都必须出现在某一篇月度笔记里（脱敏清单里的除外）。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync, statSync } from 'node:fs';
import { globSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { renderZhNav, normalizeBody } from './nav.mjs';

const isDirectory = (p) => statSync(p).isDirectory();

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '../..');
const WRITE = process.argv.includes('--write');
const EMIT_CHUNKS = process.argv.includes('--emit-chunks');
const monthsFlag = process.argv.indexOf('--months');
const onlyMonths = monthsFlag >= 0 ? process.argv[monthsFlag + 1].split(',') : null;

const OUT = join(ROOT, '.flomo/out');
const CHUNK_CHARS = 4200;

const { memos: rawMemos } = JSON.parse(readFileSync(join(ROOT, '.flomo/memos.json'), 'utf8'));
const redactions = JSON.parse(readFileSync(join(ROOT, 'scripts/flomo/redactions.json'), 'utf8'));
const coverage = existsSync(join(ROOT, '.flomo/coverage.json'))
  ? JSON.parse(readFileSync(join(ROOT, '.flomo/coverage.json'), 'utf8'))
  : {};

// ---------------------------------------------------------------- 脱敏

const dropKeys = new Set(redactions.drops.map((d) => d.key));
const redactByKey = new Map(redactions.redactions.map((r) => [r.key, r.patterns]));

for (const memo of rawMemos) {
  for (const p of redactByKey.get(memo.key) ?? []) {
    memo.text = memo.text.replace(new RegExp(p.find, 'gm'), p.replace).trim();
  }
}
const memos = rawMemos.filter((m) => !dropKeys.has(m.key) && m.text.trim().length > 0);

// ---------------------------------------------------------------- 方向分类

/** 九个方向。tags 命中优先级最高，其次关键词打分，最后落到 misc。 */
const DIRECTIONS = [
  {
    id: 'ai',
    zh: 'AI 与 Agent 系统',
    en: 'AI and Agent Systems',
    tagsEn: ['AI', 'Agent', 'LLM'],
    tags: [
      'AI', 'ai', '格物/AI', '格物/ai', '格物/AI/product', '格物/AI/open-source', '格物/ai）—', '格物/AI绘画',
      '格物/rag', '格物/ralph', '格物/openclaw', 'OpenClaw', 'openclaw', '格物/evomap', '格物/youmind', 'youmind',
      '格物/ios', '格物/iphone', '格物/mac', '格物/苹果', '格物/meta', '格物/Google', '格物/notion', '格物/Obsidian',
      '格物/Obsidian）—', '格物/flomo', '格物/second', '格物/tiptap', '格物/nodejs', '格物/real-time', '格物/机器人',
      '格物/脑机接口', '格物/芯片', '格物/算法', 'ailoha', 'ailoha/测试', '格物/安全', 'AI产品', '格物/交互', '格物/交互）—',
      '格物/meta', '格物/阿福', '格物/Apple', '格物/苹果',
    ],
    keywords: [
      'AI', 'Agent', 'agent', 'LLM', '大模型', 'prompt', '提示词', '智能体', 'token', 'Token',
      '训练', '推理', '微调', '蒸馏', 'GPT', 'Claude', 'Codex', 'Gemini', 'DeepSeek', 'MCP', 'RAG', 'embedding',
      '向量', '算力', 'GPU', '多模态', '上下文', '幻觉', 'copilot', 'vibe coding', 'harness', 'eval', 'Eval',
      'benchmark', 'Cursor', 'OpenAI', 'Anthropic', '数字人', '知识库', 'chatbot', 'gpt', 'claude',
    ],
  },
  {
    id: 'engineering',
    zh: '产品、工程与开源',
    en: 'Product, Engineering and Open Source',
    tagsEn: ['Product Strategy', 'Open Source', 'Development'],
    tags: [
      '领域/软件工程', '格物/开发', '格物/编程', '格物/产品', '格物/工具', '格物/系统学', '格物/控制论', '技术选型',
      '架构思维', '格物/开源', '格物/区块链', '格物/手机软件', '格物/数据分析', '格物/支付', '格物/线上支付',
      '领域', '领域/工具使用技巧', '领域/project', 'idea', '格物/idea', '格物/设计', '格物/机器人',
    ],
    keywords: [
      '架构', '代码', '开源', 'GitHub', 'github', '部署', '性能', 'API', '接口', '数据库', '前端', '后端',
      '重构', '测试', '工程', 'PR', '系统设计', '交互', 'UI', 'UX', 'MVP', '产品经理', '迭代',
      '监控', '容器', 'Kubernetes', 'k8s', 'Docker', '运维', 'debug', 'Debug', 'bug', '技术选型',
      'schema', 'SDK', 'App', 'app', '插件', '工作流', '自动化', '设计',
    ],
  },
  {
    id: 'business',
    zh: '商业、投资与职业',
    en: 'Business, Investing and Career',
    tagsEn: ['Career', 'Indie Hacker', 'Solo Builder'],
    tags: [
      '格物/金融', '格物/投资', '格物/投资）—', '格物/商业', '格物/创业', '格物/理财', '格物/市场', '格物/股市',
      '格物/银行', '格物/资产', '格物/中产', '格物/币安', '格物/虚拟货币', '格物/孙宇晨',
      '格物/纳瓦尔宝典', '格物/富兰克林', '格物/雷军', '格物/蔡崇信', '格物/高盛', '投资建议', '能源投资',
      '市场预测', '石油', '原油价格', '大宗商品', 'OPEC', '预测', '格物/量化', '格物/国富论', '格物/经济学',
      '格物/品牌', '格物/营销', '格物/胖东来', '格物/小米', '格物/信任经济', '格物/消费券', '格物/香港',
    ],
    keywords: [
      '商业', '创业', '投资', '金融', '股票', '估值', '市盈率', '现金流', '融资', '定价', '商业模式',
      '销售', '竞争', '营收', 'PMF', '毛利',
      '职业', '面试', '简历', '跳槽', '打工', '工资', '年薪', '比特币', '虚拟货币', '基金', '利率', '经济',
      '供给', '护城河', '红利', '转化率', '估值', 'IPO', '上市',
    ],
  },
  {
    id: 'self',
    zh: '自我认知与心理',
    en: 'Self-Knowledge and Psychology',
    tagsEn: ['Personal Growth', 'Psychology', 'Inner Work'],
    tags: [
      '爱情', '格物/爱', '格物/爱）—', '观我', '观我/成见', '观我/美', '观我/亲密关系', '观我/学习方式', '观我/AI',
      '知我', '知我/记账', '格物/知我', '格物/亲密关系', '格物/心理学', '格物/心理驱动', '格物/情绪', '格物/人格',
      '格物/自卑', '格物/焦虑', '格物/钝感力', '格物/感受', '格物/感性', '格物/松弛', '格物/着急', '格物/独处',
      '格物/犹豫', '格物/遗憾', '格物/注意力', '格物/状态管理', '情绪变化', '心理模型', '自我/叙事',
      '人生/成长', '人生', '工作框架', '格物/知行合一', '格物/意志', '格物/主体性', '格物/身份',
      '格物/尊严', '格物/自由', '格物/改变', '格物/选择', '格物/选择的悖论', '格物/直觉', '格物/期望',
      '格物/能量', '格物/成长',
    ],
    keywords: [
      '情绪', '焦虑', '抑郁', '自卑', '孤独', '心理', '人格', '依恋', '回避', '自尊', '内耗', '边界',
      '自省', '元认知', '内观', '亲密关系', '爱情', '恋爱', '分手', '婚姻', '父母', '朋友',
      '共情', '意志力', '拖延', '动机', '恐惧', '勇气', '意义感', '幸福感', '成长',
      '偏见', '直觉', '多巴胺', '血清素', '潜意识', '心理学', '内省',
    ],
  },
  {
    id: 'thought',
    zh: '阅读、思想与历史',
    en: 'Reading, Ideas and History',
    tagsEn: ['Philosophy', 'Buddhism', 'Learning'],
    tags: [
      '佛学', '佛学/禅宗', '佛学/入世', '格物/佛学', '格物/禅宗', '格物/金刚经', '格物/哲学', '格物/道家',
      '格物/法家', '格物/儒家', '格物/信仰', '格物/宗教', '格物/清真寺', '格物/教堂', '格物/印度教',
      '印度教', '印度教/尼泊尔', '格物/历史', '格物/世界历史', '格物/中国历史', '格物/文明', '格物/丝绸之路',
      '格物/进化论', '格物/进化心理学', '格物/生物', '格物/生物学', '格物/生物进化学', '格物/语言学', '格物/符号学',
      '格物/美学', '审美', '格物/艺术', '格物/意义', '格物/社会', '格物/政治', '格物/经济学', '格物/战争',
      '格物/外交', '格物/文化', '格物/思维', '格物/常识', '格物/学习', '格物/阅读方法', '格物/摘抄', '格物/故事',
      '格物/叙事', '格物/神秘', '格物/玄学', '格物/周易', '格物/贝叶斯', '格物/概率化思维', '格物/不确定性',
      '知世', '知世/历史', '知世/美学', '知世/文化', '知世/语言的本味', '格物/红楼梦',
      '格物/金瓶梅', '格物/金庸', '格物/明朝那些事', '格物/大江大海一九四九', '格物/有闲阶级论',
      '格物/理性乐观派', '格物/瓦尔登湖', '格物/沉思录', '格物/教父', '格物/白夜行', '格物/回忆录',
      '格物/回忆录（整理相册中）', '格物/禅与摩托车维修艺术', '格物/我们为什么要睡觉', '格物/人生的智慧',
      '格物/高效能人士', '格物/人性的弱点', '格物/非暴力沟通', '格物/关于说话的一切', '格物/如何快速了解一个行业',
      '格物/凯文凯利', '格物/赫尔曼', '格物/赫尔曼黑塞', '格物/第一性原则', '格物/汉密尔顿', '格物/摩根',
      '格物/苏美尔', '格物/印度', '格物/制度', '格物/语言',
    ],
    keywords: [
      '佛', '禅', '哲学', '道家', '儒家', '法家', '王阳明', '伦理', '社会学',
      '人类学', '进化', '达尔文', '基因', '文明史', '政治', '经济学', '康德', '尼采', '叔本华',
      '加缪', '荣格', '弗洛伊德', '书', '读完', '作者', '论文', '主义', '范式',
      '贝叶斯', '悖论', '体系',
    ],
  },
  {
    id: 'travel',
    zh: '旅行、地理与城市',
    en: 'Travel, Places and Cities',
    tagsEn: ['Travel', 'Exploration', 'Adventure'],
    tags: [
      '旅居', '徒步', '格物/老挝', '格物/柬埔寨', '格物/暹粒', '格物/吴哥窟', '格物/越南', '格物/泰国',
      '格物/天灯节', '格物/日本', '格物/奈良', '格物/京都', '格物/熊野古道', '格物/朝圣之路', '格物/拉萨',
      '格物/冈仁波齐', '格物/哲蚌寺', '格物/多恩神山', '格物/格聂神山', '格物/尼泊尔', '格物/印度',
      '格物/新加坡', '格物/台湾', '格物/韩国', '格物/朝鲜', '格物/俄罗斯', '格物/土耳其',
      '格物/土库曼斯坦', '格物/西班牙', '格物/意大利', '格物/埃及', '格物/墨西哥', '格物/巴西', '格物/孟加拉',
      '格物/美国', '格物/波兰', '格物/城市', '格物/城市）—', '格物/深圳', '格物/上海', '格物/杭州',
      '格物/南京', '格物/南通', '格物/西安', '格物/洛阳', '格物/邯郸', '格物/郑州', '格物/重庆', '格物/成都',
      '格物/广州', '格物/汕头', '格物/东莞', '格物/潮汕', '格物/东北', '格物/长春', '格物/湖北', '格物/县城',
      '格物/绍兴', '格物/嘉兴', '格物/机场', '格物/地铁', '格物/港口', '格物/空间', '格物/建筑', '格物/教堂',
      '格物/清真寺', '格物/攀岩', '格物/简单背包', '格物/荒野求生', '格物/进入空气稀薄地带',
      '格物/一个游荡者的世界', '格物/徐霞客', '格物/念念远山', '格物/街道', '格物/咖啡', '格物/美食',
      '格物/舞蹈', '格物/动物园', '格物/野生动物保护',
    ],
    keywords: [
      '旅行', '旅居', '徒步', '爬山', '雪山', '朝圣', '签证', '海关', '航班', '酒店', '民宿',
      '老挝', '柬埔寨', '吴哥', '暹粒', '泰国', '越南', '日本', '奈良', '京都', '印度', '尼泊尔',
      '拉萨', '西藏', '新疆', '东南亚', '欧洲', '非洲', '深圳', '上海', '西安', '杭州', '海边',
      '寺庙', '石窟', '博物馆', '古镇', '火车站', '骑行', '徒步',
    ],
  },
  {
    id: 'life',
    zh: '身体、健康与日常',
    en: 'Body, Health and Daily Life',
    tagsEn: ['Adventure', 'Exploration'],
    tags: [
      '格物/健康', '格物/健身', '格物/跑步', '格物/睡觉', '格物/运动', '格物/医学', '格物/内啡肽',
      '格物/血清素', '格物/茶文化', '格物/茶', '格物/从头到脚说健康', '格物/生活常识',
      '格物/饮用水', '格物/天气', '格物/气候', '格物/环保', '格物/马赛人', '格物/鹿', '格物/鹿 ',
      '格物/游戏', '格物/游戏）—', '格物/蹦迪', '格物/玩偶', '格物/玩具', '格物/冰箱贴', '格物/礼物',
      '格物/电影', '格物/短视频', '格物/摄影', '格物/梦', '格物/足球', '格物/世界杯',
    ],
    keywords: [
      '健康', '健身', '跑步', '睡眠', '睡觉', '失眠', '咖啡', '医学', '运动', '冥想',
      '医院', '吃药', '营养', '皮肤', '养生', '体重', '肌肉', '疾病', '病毒', '免疫',
      '气候', '下雨', '季节', '美食', '露营', '纪录片', '世界杯',
    ],
  },
  {
    id: 'content',
    zh: '内容、创作与记录',
    en: 'Content, Craft and Recording',
    tagsEn: ['Content Strategy', 'SEO', 'GEO'],
    tags: [
      '格物/创作', '格物/内容', '格物/内容）—', '格物/写作', '格物/记录', '格物/标签', '格物/文本', '格物/视觉',
      '格物/播客', '格物/导演', '格物/编剧', '格物/新闻', '格物/科技新闻', '每日简报', '格物/feed', '格物/信息',
      '生命树', '格物/演讲', '格物/表达', '格物/策划', '格物/影响力',
    ],
    keywords: [
      '写作', '创作', '内容', '博客', '视频', '播客', '读者', '分发', 'newsletter',
      'SEO', 'GEO', '流量', '标题', '封面', '排版', '编辑', '发表', '公开', '叙事', '影像',
      '摄影', '剪辑', '选题', '素材', '知识库', '订阅',
    ],
  },
  {
    id: 'misc',
    zh: '日常与其他',
    en: 'Daily Notes and Everything Else',
    tagsEn: [],
    tags: ['格物/todo', '格物/回顾', '格物/回忆', '回忆', '日志', '格物/秘密', '格物/观察', '格物/聊天',
      '格物/群聊', '格物/朋友', '格物/好奇心', '格物/兴趣', '格物/热爱', '格物/运气', '格物/性格', '格物/品味',
      '格物/平衡', '格物/生活', '格物/世界', '格物/2049', '格物/00后', '格物/自我', '格物/关心'],
    keywords: [],
  },
];

const tagIndex = new Map();
for (const [i, d] of DIRECTIONS.entries()) for (const t of d.tags) if (!tagIndex.has(t)) tagIndex.set(t, i);

function classify(memo) {
  for (const tag of memo.tags) {
    const hit = tagIndex.get(tag);
    if (hit !== undefined) return hit;
  }
  const scored = DIRECTIONS.map((d, i) => {
    let score = 0;
    for (const kw of d.keywords) if (memo.text.includes(kw)) score += 1;
    return { i, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  if (scored.length && scored[0].score >= 1) return scored[0].i;
  return DIRECTIONS.length - 1;
}

// ---------------------------------------------------------------- 标题
// 2025 年前后的旧文章里，标题是当年一条条写出来的，只要能用时间戳对上就继续沿用。

const cleanTitle = (s) =>
  s
    .replace(/[`*>#]/g, '')
    .replace(/^(其实|感觉|我觉得就是|我觉得|就是|今天|突然想到|想到一个|突然意识到)[，,、\s]*/, '')
    .replace(/\s+/g, ' ')
    .replace(/[。！？!?；;，,、.]+$/, '')
    .trim();

function autoTitle(memo) {
  const firstLine = memo.text.split('\n')[0].trim();
  const t = cleanTitle(firstLine);
  if (!t) return '一条记录';
  if (t.length <= 26) return t;
  const cut = t.slice(0, 26);
  const boundary = Math.max(cut.lastIndexOf('，'), cut.lastIndexOf('。'), cut.lastIndexOf('、'), cut.lastIndexOf(' '));
  return (boundary > 12 ? cut.slice(0, boundary) : cut).trim();
}

function existingArticle(month, lang = 'zh') {
  const file = join(ROOT, `content/${lang}/growth/posts/${month}-thought-notes.md`);
  if (!existsSync(file)) return null;
  const raw = readFileSync(file, 'utf8');
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  const fm = fmMatch ? fmMatch[1] : '';
  const body = raw.replace(/^---\n[\s\S]*?\n---\n?/, '');
  const titles = new Map();
  let heading = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^###\s+(.*)$/);
    if (h) {
      heading = cleanTitle(h[1]);
      continue;
    }
    if (!heading) continue;
    const t = line.match(
      /^>\s*(\d{4})\s*[-年]?\s*(\d{1,2})\s*[-月]?\s*(\d{1,2})\s*日?\s*[-·|]?\s*(\d{1,2}):(\d{2}):(\d{2})/,
    );
    if (t) {
      const key = `${t[1]}-${String(t[2]).padStart(2, '0')}-${String(t[3]).padStart(2, '0')} ${String(t[4]).padStart(2, '0')}:${t[5]}:${t[6]}`;
      if (!titles.has(key)) titles.set(key, heading);
      heading = null;
    }
  }
  const tldr = [];
  const tldrBlock = fm.match(/^tldr:\n((?:\s*-\s*.*\n?)+)/m);
  if (tldrBlock) {
    for (const line of tldrBlock[1].split('\n')) {
      const item = line.replace(/^\s*-\s*/, '').trim().replace(/^["']|["']$/g, '');
      if (item) tldr.push(item);
    }
  }
  const title = (fm.match(/^title:\s*['"]?(.*?)['"]?\s*$/m) ?? [])[1] ?? '';
  // cover 是人工挑的图，重建正文时不能丢
  const cover = (fm.match(/^cover:\n((?:[ \t]+.*\n?)+)/m) ?? [])[0]?.trimEnd() ?? '';
  // 「月度精选」是当年一条条挑出来的阅读入口，保留下来放在大类归档之前
  const keptHeadings = lang === 'zh'
    ? [/^##\s*月度精选/]
    : [/^##\s*Selected Notes of the Month/];
  const kept = [];
  const bodyLines = body.split('\n');
  for (const [i, line] of bodyLines.entries()) {
    if (!keptHeadings.some((re) => re.test(line))) continue;
    let end = i + 1;
    while (end < bodyLines.length && !/^##\s/.test(bodyLines[end])) end += 1;
    kept.push(bodyLines.slice(i, end).join('\n').trimEnd());
  }
  return { titles, tldr, title, file, cover, kept };
}

// ---------------------------------------------------------------- 组装

const pad = (n) => String(n).padStart(2, '0');

function frontMatter(month, entries, stats, prev) {
  const [y, m] = month.split('-');
  const lastEntry = entries[entries.length - 1];
  const lastMemo = lastEntry.memo ?? lastEntry;
  const lastDay = new Date(Date.UTC(Number(y), Number(m), 0));
  const monthEnd = `${month}-${pad(lastDay.getUTCDate())}`;
  const isFutureEnd = new Date(`${monthEnd}T23:59:59+08:00`) > new Date();
  // 当月还没结束时，月末时间戳会被 Hugo 当成 future content 而不发布，
  // 所以退回最后一条笔记的真实时间。
  const date = isFutureEnd ? `${lastMemo.date}T${lastMemo.time}+08:00` : `${monthEnd}T23:59:59+08:00`;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/.test(date)) {
    throw new Error(`${month}: generated an unparsable date: ${date}`);
  }

  const titleDirs = stats.slice(0, 3).map((s) => s.direction.zh.replace(/^[^、]*、/, ''));
  const title = `${y}年${Number(m)}月思考笔记：${titleDirs.join('、')}`;

  const dirLine = stats.slice(0, 6).map((s) => `${s.direction.zh} ${s.count} 条`).join(' · ');
  const description = `这是一份 ${y} 年 ${Number(m)} 月的完整记录，共 ${entries.length} 条笔记，按主题分成 ${stats.length} 个方向：${dirLine}。记录按主题归档，条目内保留原始时间戳；只有会伤到具体人或自己的内容被隐去。`;

  const tldr = prev?.tldr?.length
    ? prev.tldr
    : [
        `${y} 年 ${Number(m)} 月共 ${entries.length} 条记录，主要集中在${stats.slice(0, 3).map((s) => s.direction.zh).join('、')}。`,
        ...stats
          .slice(0, 2)
          .map((s) => {
            const e = [...entries].filter((x) => classify(x.memo) === s.idx).sort((a, b) => b.memo.text.length - a.memo.text.length)[0];
            return e ? `${s.direction.zh}里写得最长的一条是「${e.title}」。` : null;
          })
          .filter(Boolean),
      ];

  const tagList = ['Blog', 'Monthly Notes', 'Personal Reflection'];
  for (const s of stats.slice(0, 3)) for (const t of s.direction.tagsEn) if (!tagList.includes(t)) tagList.push(t);

  return `---
title: '${title.replace(/'/g, '’')}'
ShowRssButtonInSectionTermList: true
date: ${date}
showtoc: true
weight: 1
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
${prev?.cover ? `${prev.cover}\n` : ''}keywords: []
tags:
${tagList.slice(0, 8).map((t) => `  - ${t}`).join('\n')}
description: >
  ${description.replace(/'/g, '’')}
tldr:
${tldr.slice(0, 4).map((t) => `  - "${String(t).replace(/"/g, '”').replace(/\s+/g, ' ').trim()}"`).join('\n')}
maturity: budding
---

`;
}

function renderCard(entry) {
  const { memo, title } = entry;
  const tags = memo.tags.length ? ` · ${memo.tags.map((t) => `\`#${t}\``).join(' ')}` : '';
  let paragraphs = normalizeBody(memo.text)
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean);
  // flomo 里第一段往往就是标题本身，重复一遍会让文章变脏；
  // 但整条就这一句时不能删，否则会留下一个只有标题的空条目。
  if (paragraphs.length > 1 && cleanTitle(paragraphs[0]) === title) paragraphs = paragraphs.slice(1);
  return `<!--memo:${memo.key}-->
### ${title}

> ${memo.date} ${memo.time}${tags}

${paragraphs.join('\n\n')}
`;
}

const NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

function renderArchive(entries, { numbered = true } = {}) {
  const byDirection = new Map();
  for (const e of entries) {
    const idx = classify(e.memo);
    if (!byDirection.has(idx)) byDirection.set(idx, []);
    byDirection.get(idx).push(e);
  }
  const stats = [...byDirection.entries()]
    .map(([idx, list]) => ({ idx, direction: DIRECTIONS[idx], count: list.length, list }))
    .sort((a, b) => b.count - a.count);

  const lines = [];
  for (const [i, s] of stats.entries()) {
    // 追加型的补录段不写序号：长文自身已经用了「一、二、」，再排一次会撞号
    lines.push(numbered ? `## ${NUMERALS[i] ?? i + 1}、${s.direction.zh}` : `## ${s.direction.zh}`, '', `*${s.count} 条记录*`, '');
    for (const e of s.list) lines.push(renderCard(e), '');
  }
  return { stats, body: lines.join('\n').trimEnd() };
}

/** 去掉此前生成的补录/附录段，让重复运行不会叠加两份。 */
function stripGeneratedTail(text) {
  const cut = text.search(/\n---\n\n## (?:补录|附录)：/);
  return cut >= 0 ? text.slice(0, cut) : text;
}

// ---------------------------------------------------------------- 主线

const EN_MODES = {
  '2025-02': 'full', '2025-03': 'full', '2025-04': 'full', '2025-05': 'full',
  '2025-06': 'full', '2025-07': 'full', '2025-08': 'full', '2025-09': 'full',
  '2025-10': 'full', '2025-11': 'full', '2026-08': 'full', '2026-09': 'full',
  '2025-12': 'full', '2026-01': 'full', '2026-02': 'full',
  '2026-03': 'full', '2026-04': 'full',
  '2026-05': 'appendix-all', '2026-06': 'appendix-all', '2026-07': 'appendix-all',
};

const allMonths = [...new Set(memos.map((m) => m.month))].sort();
const months = onlyMonths ?? allMonths;
const plan = {};
const keyIndex = {};
// placed = 最终一定会出现在公开文章里的 memo key（含此前已经发布过的完整月份）。
const placed = new Set();

// 只清掉脚本自己生成的中间件：`.en.md` 是翻译成果（贵且不可再生），永远不删。
rmSync(join(OUT, 'zh'), { recursive: true, force: true });
if (EMIT_CHUNKS) {
  for (const f of globSync(join(OUT, 'en', '**', '*.zh.md'))) rmSync(f, { force: true });
  for (const d of globSync(join(OUT, 'en', '*'))) {
    if (isDirectory(d) && readdirSync(d).length === 0) rmSync(d, { recursive: true, force: true });
  }
}
mkdirSync(join(OUT, 'zh'), { recursive: true });

for (const month of months) {
  const monthMemos = memos
    .filter((m) => m.month === month)
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
  if (!monthMemos.length) continue;

  const mode = EN_MODES[month] ?? 'full';
  const prev = existingArticle(month);
  const usedTitles = new Set();
  const entries = monthMemos.map((memo) => {
    let title = prev?.titles?.get(`${memo.date} ${memo.time}`) ?? autoTitle(memo);
    let base = title;
    let n = 2;
    while (usedTitles.has(title)) title = `${base}（${n++}）`;
    usedTitles.add(title);
    return { memo, title };
  });

  const dir = join(OUT, 'en', month);

  if (mode === 'appendix-missing' || mode === 'appendix-all') {
    const uncoveredIds = new Set((coverage[month]?.uncoveredItems ?? []).map((i) => i.id));
    const appendixEntries = mode === 'appendix-missing' ? entries.filter((e) => uncoveredIds.has(e.memo.id)) : entries;
    for (const memo of monthMemos) {
      if (mode === 'appendix-all' || !uncoveredIds.has(memo.id)) placed.add(memo.key);
    }
    if (!appendixEntries.length) {
      plan[month] = { action: 'skip', enMode: mode, entries: 0 };
      keyIndex[month] = [];
      continue;
    }
    const { stats, body } = renderArchive(appendixEntries, { numbered: false });
    const heading = mode === 'appendix-all' ? '## 附录：本月原始记录' : '## 补录：本月其他记录';
    const intro = `*下面 ${appendixEntries.length} 条是当月的原始记录，按主题归档。*`;
    const zhOut = `\n\n---\n\n${heading}\n\n${intro}\n\n${body.trimEnd()}\n`;
    writeFileSync(join(OUT, 'zh', `${month}.md`), zhOut.trimStart());

    if (WRITE && prev) {
      const existing = stripGeneratedTail(readFileSync(prev.file, 'utf8')).trimEnd();
      writeFileSync(prev.file, existing + zhOut);
    }

    plan[month] = {
      action: 'appendix',
      enMode: mode,
      entries: appendixEntries.length,
      stats: stats.map((s) => ({ id: s.direction.id, count: s.count })),
      heading,
      intro,
    };
    keyIndex[month] = appendixEntries.map((e) => e.memo.key);
    for (const e of appendixEntries) placed.add(e.memo.key);
    if (EMIT_CHUNKS) emitChunks(dir, month, appendixEntries);
    continue;
  }

  if (mode === 'none') {
    plan[month] = { action: 'keep', enMode: mode, entries: monthMemos.length };
    keyIndex[month] = [];
    for (const m of monthMemos) placed.add(m.key);
    continue;
  }

  const { stats, body } = renderArchive(entries);
  const [y, m] = month.split('-');
  const first = entries[0].memo;
  const last = entries[entries.length - 1].memo;
  const intro = [
    `# ${y} 年 ${Number(m)} 月思考笔记`,
    '',
    `> **本月共 ${entries.length} 条笔记** | 记录时间：${first.date} — ${last.date}`,
    '>',
    `> **主题分布**：${stats.map((s) => `${s.direction.zh} ${s.count} 条`).join(' · ')}`,
    '>',
    '> 以下是这个月的全部记录，按主题归档，条目内保留原始时间戳。',
    '',
  ].join('\n');

  // 开头的大类导航：先给目录，读者不用从第一条读到最后一条
  const navCounts = stats.map((s, i) => ({
    name: s.direction.zh,
    heading: `${NUMERALS[i] ?? i + 1}、${s.direction.zh}`,
    count: s.count,
  }));
  const navExtras = (prev?.kept ?? []).map((block) => ({
    label: block.split('\n')[0].replace(/^##\s*/, '').split('|')[0].trim(),
    heading: block.split('\n')[0].replace(/^##\s*/, '').trim(),
    count: (block.match(/^###\s/gm) ?? []).length,
  }));
  const nav = renderZhNav({ counts: navCounts, total: entries.length, extras: navExtras });

  const kept = (prev?.kept ?? []).join('\n\n');
  const article =
    frontMatter(month, entries, stats, prev) +
    `${intro}\n${nav}` +
    (kept ? `\n${kept}\n\n` : '\n') +
    `${body.trimEnd()}\n`;
  writeFileSync(join(OUT, 'zh', `${month}.md`), article);
  if (WRITE) writeFileSync(join(ROOT, `content/zh/growth/posts/${month}-thought-notes.md`), article);

  plan[month] = {
    action: 'build',
    enMode: mode,
    entries: entries.length,
    total: entries.length,
    extras: navExtras,
    stats: stats.map((s, i) => ({
      id: s.direction.id,
      count: s.count,
      en: s.direction.en,
      heading: `${NUMERALS[i] ?? i + 1}、${s.direction.zh}`,
    })),
  };
  keyIndex[month] = entries.map((e) => e.memo.key);
  for (const e of entries) placed.add(e.memo.key);
  if (EMIT_CHUNKS) emitChunks(dir, month, entries);
}

function emitChunks(dir, month, entries) {
  mkdirSync(dir, { recursive: true });
  let chunk = [];
  let chars = 0;
  let index = 1;
  const flush = () => {
    if (!chunk.length) return;
    const name = String(index).padStart(2, '0');
    const header = [
      `<!-- CHUNK ${month} #${name} | ${chunk.length} memos -->`,
      '',
      'Translate every memo in this file into natural, faithful English.',
      '',
      'Rules:',
      '1. Keep every `<!--memo:KEY-->` marker exactly as it is, in the same order.',
      '2. Translate the `### ` title and the body paragraphs.',
      '3. Keep the `> ` line as-is: same timestamp, same `#tag` codes.',
      '4. Keep paragraph breaks. Do not summarise, merge, reorder or skip anything.',
      '5. Write the translation to the sibling file with the same name but `.en.md`.',
      '6. Output only the translated chunk file — no commentary.',
      '',
      '---',
      '',
    ].join('\n');
    writeFileSync(join(dir, `${name}.zh.md`), `${header}${chunk.join('\n')}`);
    index += 1;
    chunk = [];
    chars = 0;
  };
  for (const e of entries) {
    chunk.push(renderCard(e));
    chars += e.memo.text.length + e.title.length;
    if (chars >= CHUNK_CHARS) flush();
  }
  flush();
  plan[month].chunks = index - 1;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'plan.json'), `${JSON.stringify(plan, null, 1)}\n`);
writeFileSync(join(OUT, 'keys.json'), `${JSON.stringify(keyIndex, null, 1)}\n`);

console.log(`built ${Object.keys(plan).length} months -> ${OUT}${WRITE ? ' (written to content/)' : ''}`);
for (const [month, info] of Object.entries(plan)) {
  console.log(
    `  ${month}  ${info.action.padEnd(8)} ${String(info.entries).padStart(4)} memos` +
      (info.chunks ? `  ${String(info.chunks).padStart(3)} chunks` : '') +
      `  [${info.enMode}]`,
  );
}

// 覆盖自检：脱敏后剩下的每一条 memo 都必须落进某一篇月度笔记
const missing = memos.filter((m) => !placed.has(m.key));
console.log(`\ncoverage: ${placed.size}/${memos.length} memos placed; dropped by redaction: ${dropKeys.size}`);
if (missing.length) {
  console.error(`MISSING ${missing.length} memos, first: ${missing.slice(0, 3).map((m) => `${m.key}@${m.date}`).join(', ')}`);
  process.exitCode = 1;
}

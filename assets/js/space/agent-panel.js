// BEAR OS standalone agent task panel.
//
// A calm, bilingual task UI for the bounded agent loop. It renders public
// operational work (model requests, tool calls, approvals) as a real timeline —
// never fake progress, receipts or model answers. Private note and draft text
// stay out of the model context; the only exception is append_note after the
// visitor explicitly approves that exact text.
//
// mountAgent({host, catalog, execute, getState, notify}) -> disposer

import { safeURL } from './state.mjs';
import { contextualQuestion, serviceMessage } from './companion.mjs';
import {
  runAgentTask,
  createTaskStore,
  createToolExecutor,
  createApprovalGate,
  interpretRunResult,
  planAnswerSegments,
  escapeHTML,
  buildPublicContext,
} from './agent-loop.mjs';

const TOOL_LABELS = {
  search_writing: ['搜索文章', 'Search writing'],
  read_writing: ['阅读文章', 'Read article'],
  open_app: ['打开应用', 'Open app'],
  list_photos: ['照片列表', 'List photos'],
  show_place: ['查看地点', 'Show place'],
  append_note: ['追加笔记', 'Append note'],
  sandbox_run: ['本地命令', 'Local command'],
};

const STEP_STATUS_LABELS = {
  running: ['进行中', 'running'],
  ok: ['完成', 'done'],
  error: ['失败', 'failed'],
  declined: ['已拒绝', 'declined'],
  duplicate: ['重复，未再执行', 'duplicate'],
  interrupted: ['已中断', 'interrupted'],
};

function fallbackArticleText(html) {
  // Only used when no DOMParser-based sanitizer is injected.
  return String(html ?? '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function createDOMArticleParser() {
  return function parseArticleText(html, source) {
    const doc = new DOMParser().parseFromString(String(html ?? ''), 'text/html');
    const content = doc.querySelector('.post-content') || doc.querySelector('article') || doc.body;
    if (!content) return '';
    // Import article text only; never its scripts or active embeds.
    content.querySelectorAll('script,style,iframe,object,embed,form,input,button,link,meta,svg,math,template,noscript').forEach((el) => el.remove());
    return (content.textContent || '').replace(/\s+/g, ' ').trim();
  };
}

export function mountAgent({ host, catalog, execute, getState, notify, getContext } = {}) {
  if (!host || typeof host.querySelector !== 'function') throw new TypeError('mountAgent needs a host element');
  const zh = catalog?.language === 'zh';
  const t = (cn, en) => (zh ? cn : en);
  const origin = typeof location !== 'undefined' ? location.origin : 'https://cubxxw.com';
  const publicContext = buildPublicContext(catalog);
  const store = createTaskStore({ storage: (() => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } })() });

  const executeTool = createToolExecutor({
    catalog,
    execute,
    getState,
    origin,
    parseArticleText: typeof DOMParser !== 'undefined' ? createDOMArticleParser() : fallbackArticleText,
    fetchImpl: (...args) => fetch(...args),
  });

  let disposed = false;
  let busy = false;
  let controller = null;
  let pendingApproval = null;
  let focus = getContext?.() || null;
  let selectedText = '';
  let recognition = null;
  const workspace = host.closest('[data-bear-workspace]');
  const announce = state => { if(!disposed || state==='idle')workspace?.dispatchEvent(new CustomEvent('bear:agent-status', { detail:{state} })); };
  const expand = () => host.closest('[data-space-window]')?.setAttribute('data-companion-mode','expanded');

  // ── Markup (structure only; every dynamic value goes through textContent) ──
  host.innerHTML = `
    <div class="bear-agent" data-agent-root>
      <header class="bear-agent__header">
        <div class="bear-agent__identity"><span class="bear-agent__orb" aria-hidden="true">✳</span><div><strong>${t('空间助手','Space companion')}</strong><small>DeepSeek Flash</small></div><button type="button" data-agent-history aria-label="${t('查看任务记录','Show task history')}">◷</button></div>
        <h2>${t('接下来，想探索什么？','Where shall we go next?')}</h2>
        <p>${t('找文章、了解作品，或者一起去旅途中看看。','Find a thought, discover a project, or revisit a journey.')}</p>
      </header>
      <div class="bear-agent__body">
        <div class="bear-agent__log" data-chat-log role="log" aria-label="${t('任务记录', 'Task log')}"></div>
        <div class="bear-agent__composer">
          <button type="button" class="bear-agent__context" data-agent-context hidden></button>
          <form>
            <textarea data-agent-input rows="2" maxlength="4000" aria-label="${t('给空间助手的任务', 'Task for the space companion')}" placeholder="${t('说说你的想法…', 'What’s on your mind?')}"></textarea>
            <div class="bear-agent__controls">
              <button type="button" class="bear-agent__voice" data-agent-voice aria-label="${t('语音输入','Voice input')}" title="${t('语音输入','Voice input')}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3M9 21h6"/></svg></button>
              <button type="submit" class="bear-agent__send" data-agent-send aria-label="${t('发送','Send')}">↑</button>
              <button type="button" class="bear-agent__stop" data-agent-stop hidden>${t('停止', 'Stop')}</button>
            </div>
          </form>
          <p class="bear-agent__status" data-agent-status role="status" aria-live="polite">${t('⌘ / Ctrl J 唤起 · Enter 发送','⌘ / Ctrl J to open · Enter to send')}</p>
        </div>
      </div>
    </div>`;

  const root = host.querySelector('[data-agent-root]');
  const log = host.querySelector('[data-chat-log]');
  const form = host.querySelector('form');
  const input = host.querySelector('[data-agent-input]');
  const send = host.querySelector('[data-agent-send]');
  const stop = host.querySelector('[data-agent-stop]');
  const status = host.querySelector('[data-agent-status]');
  const contextButton = host.querySelector('[data-agent-context]');
  const drawContext = () => { contextButton.hidden = !focus; contextButton.textContent = focus ? `${selectedText ? t('选中文字','Selected passage') : t('结合当前内容','With context')} · ${focus.title} ×` : ''; };
  drawContext();
  contextButton.addEventListener('click',()=>{focus=null;selectedText='';drawContext();input.focus();});
  const prefill = event => {
    if (disposed) return;
    if (!event.detail?.question && input.value.trim()) { input.focus({preventScroll:true});return; }
    selectedText = event.detail?.selection || '';
    focus = event.detail?.focus || null; drawContext();
    if (event.detail?.question) input.value = event.detail.question.slice(0,4000);
    input.focus({preventScroll:true});
  };
  workspace?.addEventListener('bear:agent-prefill',prefill);
  host.querySelector('[data-agent-history]').addEventListener('click',expand);

  const setStatus = (text) => { status.textContent = text; };
  const setBusy = (value) => {
    busy = value;
    send.disabled = value;
    stop.hidden = !value;
  };

  // ── Rendering helpers (textContent / safe links only) ──────────────────────

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function previewFor(name, args) {
    if (name === 'append_note') return args?.text ?? '';
    if (name === 'sandbox_run') return args?.command ?? '';
    const parts = [];
    for (const [key, value] of Object.entries(args || {})) {
      if (typeof value === 'string' && value) parts.push(`${key}: ${value}`);
    }
    return parts.join('  ');
  }

  function toolLabel(name) {
    const labels = TOOL_LABELS[name];
    return labels ? t(labels[0], labels[1]) : name;
  }

  function renderAnswer(container, text) {
    container.replaceChildren();
    for (const segment of planAnswerSegments(text, origin)) {
      if (segment.href && safeURL(segment.href, origin)) {
        const anchor = el('a', 'bear-agent__link', `${segment.text} ↗`);
        anchor.href = segment.href;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        container.append(anchor);
      } else {
        container.append(document.createTextNode(segment.text));
      }
    }
  }

  function createStepNode(taskNode, step) {
    const li = el('li', 'bear-agent__step');
    li.dataset.agentStep = step.type;
    li.dataset.status = step.status || '';
    li.dataset.agentCallId = step.id || '';
    li.append(el('span', 'bear-agent__dot'));
    const body = el('div', 'bear-agent__step-body');
    body.append(el('strong', '', step.title));
    if (step.detail) body.append(el('small', '', step.detail));
    if (step.preview) body.append(el('pre', 'bear-agent__preview', step.preview));
    li.append(body);
    taskNode.querySelector('[data-agent-timeline]').append(li);
    return li;
  }

  function createTaskNode(question, record) {
    const section = el('section', 'bear-agent__task');
    section.dataset.agentTask = record?.id || '';
    const head = el('div', 'bear-agent__task-head');
    head.append(el('p', 'bear-agent__question', question.split('\n\n[Public ')[0]));
    const badge = el('span', 'bear-agent__badge');
    badge.dataset.agentBadge = '';
    head.append(badge);
    section.append(head);
    const timeline = el('ol', 'bear-agent__timeline');
    timeline.dataset.agentTimeline = '';
    const activity = el('details','bear-agent__activity');
    activity.dataset.agentActivity = '';
    activity.append(el('summary','',t('操作记录','Activity')));
    activity.append(timeline);
    const answer = el('div', 'bear-agent__answer');
    answer.dataset.agentAnswer = '';
    section.append(answer);
    section.append(activity);
    log.append(section);
    section.scrollIntoView({ block: 'nearest' });
    return section;
  }

  function setBadge(taskNode, record) {
    const badge = taskNode.querySelector('[data-agent-badge]');
    const labels = {
      running: [t('执行中', 'running')],
      'awaiting-approval': [t('等待确认', 'awaiting approval')],
      completed: [t('已完成', 'completed')],
      interrupted: [t('已中断', 'interrupted')],
      failed: [t('未完成', 'failed')],
    };
    badge.textContent = (labels[record.status] || [record.status])[0];
    badge.dataset.status = record.status;
  }

  function addRetry(taskNode, question) {
    if (!question) return;
    const retry = el('button', 'bear-agent__retry', t('作为新任务重试', 'Retry as a new task'));
    retry.type = 'button';
    retry.dataset.agentRetry = '';
    retry.addEventListener('click', () => { if (!busy) runTask(question,{context:false}); });
    taskNode.append(retry);
  }

  function renderRecord(record, { restored = false } = {}) {
    const taskNode = createTaskNode(record.question, record);
    setBadge(taskNode, record);
    const timeline = taskNode.querySelector('[data-agent-timeline]');
    for (const step of record.steps || []) {
      const li = el('li', 'bear-agent__step');
      li.dataset.agentStep = step.type;
      li.dataset.status = step.status || '';
      li.append(el('span', 'bear-agent__dot'));
      const body = el('div', 'bear-agent__step-body');
      if (step.type === 'model') {
        body.append(el('strong', '', `${t('模型请求', 'Model request')} #${step.round || 1}`));
      } else if (step.type === 'tool') {
        body.append(el('strong', '', toolLabel(step.name)));
        const statusLabel = STEP_STATUS_LABELS[step.status] || [step.status || '', ''];
        body.append(el('small', '', t(statusLabel[0], statusLabel[1])));
        const preview = previewFor(step.name, step.args);
        if (preview && (step.name === 'append_note' || step.name === 'sandbox_run')) body.append(el('pre', 'bear-agent__preview', preview));
        if (step.result && step.status !== 'ok') body.append(el('small', 'bear-agent__step-result', step.result.slice(0, 300)));
      } else if (step.type === 'approval') {
        body.append(el('strong', '', `${t('确认', 'Approval')}: ${toolLabel(step.name)}`));
        body.append(el('small', '', step.approved ? t('已批准', 'approved') : t('已拒绝', 'declined')));
      } else if (step.type === 'error') {
        body.append(el('strong', '', t('任务出错', 'Task error')));
        body.append(el('small', '', step.message || ''));
      }
      li.append(body);
      timeline.append(li);
    }
    if (record.answer) renderAnswer(taskNode.querySelector('[data-agent-answer]'), record.answer);
    if (restored && record.status === 'interrupted') {
      taskNode.querySelector('[data-agent-answer]').append(el('p', 'bear-agent__note', t('这个任务在上次会话中被中断，不会自动重跑。', 'This task was interrupted in an earlier session and is never rerun automatically.')));
    }
    if (record.question && (record.status === 'failed' || record.status === 'interrupted')) addRetry(taskNode, record.question);
    return taskNode;
  }

  // ── Approval: inline preview of the exact note text or command ─────────────

  function requestApproval({ taskId, name, args }) {
    const taskNode = taskId ? host.querySelector(`[data-agent-task="${taskId}"]`) : log.lastElementChild;
    const gate = createApprovalGate();
    if (taskNode) taskNode.querySelector('[data-agent-activity]').open = true;
    expand(); announce('waiting');
    const li = taskNode ? createStepNode(taskNode, {
      type: 'approval',
      title: `${t('请确认', 'Approval needed')}: ${toolLabel(name)}`,
      detail: t('只有你批准后才会执行。', 'Nothing runs without your approval.'),
      preview: previewFor(name, args),
      status: 'running',
    }) : null;
    const body = li?.querySelector('.bear-agent__step-body');
    const buttons = el('div', 'bear-agent__approval-actions');
    const approve = el('button', 'bear-agent__approve', t('批准执行', 'Approve'));
    approve.type = 'button';
    approve.dataset.agentApprove = '';
    const decline = el('button', 'bear-agent__decline', t('拒绝', 'Decline'));
    decline.type = 'button';
    decline.dataset.agentDecline = '';
    buttons.append(approve, decline);
    // The gate settles exactly once. After Stop, timeout or dispose the prompt
    // is cancelled: late clicks or a late verdict can neither run the action nor
    // mutate the global status of a newer task.
    const refresh = (approved, cancelled) => {
      if (li) {
        li.dataset.status = cancelled ? 'interrupted' : approved ? 'ok' : 'declined';
        body.append(el('small', '', cancelled ? t('已取消，未执行。', 'Cancelled; nothing ran.') : approved ? t('已批准执行', 'approved') : t('已拒绝，未执行', 'declined')));
      }
      buttons.remove();
      if (!cancelled) { announce('working'); setStatus(approved ? t('已批准，正在执行…', 'Approved. Running…') : t('已拒绝这次操作。', 'Action declined.')); }
    };
    approve.addEventListener('click', () => { if (gate.decide(true)) refresh(true, false); });
    decline.addEventListener('click', () => { if (gate.decide(false)) refresh(false, false); });
    body?.append(buttons);
    setStatus(t('有一个操作等待你确认。', 'An action is waiting for your approval.'));
    approve.focus({ preventScroll: true });
    const pending = { cancel: () => { if (gate.cancel()) refresh(false, true); } };
    pendingApproval = pending;
    return gate.promise;
  }

  // ── Model turn adapter: server-side authoritative turn, one request ────────

  async function requestTurn({ messages, language, context, signal }) {
    const response = await fetch('/.netlify/functions/bear-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, messages, publicContext: context || publicContext }),
      signal,
    });
    let data = null;
    try { data = await response.json(); } catch { data = null; }
    if (!response.ok || !data || typeof data.message !== 'string') {
      throw new Error(/^ai-[a-z-]+$/.test(data?.error) ? data.error : 'ai-unavailable');
    }
    return { message: data.message, toolCalls: Array.isArray(data.toolCalls) ? data.toolCalls : [] };
  }

  // ── Task lifecycle ─────────────────────────────────────────────────────────

  async function runTask(question, {context = true} = {}) {
    if (busy || disposed) return null;
    const raw = String(question ?? '').trim().slice(0, 4000);
    if (!raw) return null;
    const text = contextualQuestion(raw,context ? focus : null,context ? selectedText : '');
    if (!text) return null;
    recognition?.abort(); expand(); announce('working');
    const taskNode = createTaskNode(text, null);
    const live = {
      id: `pending-${Date.now().toString(36)}`,
      question: text,
      status: 'running',
      steps: [],
      answer: '',
      startedAt: new Date().toISOString(),
      endedAt: null,
      stopReason: null,
    };
    setBadge(taskNode, live);
    const timeline = taskNode.querySelector('[data-agent-timeline]');
    controller = new AbortController();
    setBusy(true);
    setStatus(t('任务执行中…', 'Working on the task…'));

    const persist = (record = live) => { try { store.save(record); } catch { /* storage is optional */ } };
    const onEvent = (event) => {
      if (disposed) return;
      if (event.type === 'task-start') {
        live.id = event.taskId;
        taskNode.dataset.agentTask = event.taskId;
      } else if (event.type === 'model-request') {
        const step = { type: 'model', round: event.round };
        live.steps.push(step);
        createStepNode(taskNode, { type: 'model', title: t('理解请求','Understanding the request'), status: 'running' });
        setStatus(t('正在思考下一步…', 'Considering the next step…'));
      } else if (event.type === 'tool-start') {
        const step = { type: 'tool', id: event.step.id, name: event.step.name, args: event.step.args, status: 'running', result: '' };
        live.steps.push(step);
        createStepNode(taskNode, {
          type: 'tool',
          id: event.step.id,
          title: toolLabel(event.step.name),
          detail: t('执行中…', 'running…'),
          preview: (event.step.name === 'append_note' || event.step.name === 'sandbox_run') ? previewFor(event.step.name, event.step.args) : '',
          status: 'running',
        });
      } else if (event.type === 'approval') {
        if (event.step.phase === 'decided') {
          const step = { type: 'approval', id: event.step.id, name: event.step.name, args: event.step.args, approved: !!event.step.approved };
          live.steps.push(step);
          live.status = 'running';
          setBadge(taskNode, live);
        } else {
          live.status = 'awaiting-approval';
          setBadge(taskNode, live);
        }
      } else if (event.type === 'tool-result') {
        const step = [...live.steps].reverse().find((s) => s.type === 'tool' && s.id === event.step.id);
        if (step) { step.status = event.step.status; step.result = event.step.result; }
        const nodes = [...timeline.querySelectorAll('[data-agent-step="tool"]')];
        const li = nodes.reverse().find((node) => node.dataset.agentCallId === event.step.id);
        if (li) {
          li.dataset.status = event.step.status;
          const detail = li.querySelector('small');
          const label = STEP_STATUS_LABELS[event.step.status] || [event.step.status, ''];
          if (detail) detail.textContent = t(label[0], label[1]);
        }
        setStatus(t('一个步骤完成，继续任务…', 'A step finished. Continuing…'));
      } else if (event.type === 'end') {
        live.status = event.status;
        live.answer = event.answer;
        live.stopReason = event.stopReason;
        live.endedAt = new Date().toISOString();
      }
      persist();
    };

    try {
      const record = await runAgentTask({
        question: text,
        language: catalog?.language || 'zh',
        publicContext,
        requestTurn,
        executeTool,
        approveTool: ({ taskId, name, args }) => requestApproval({ taskId, name, args }),
        signal: controller.signal,
        onEvent,
      });
      renderRecordInto(taskNode, record);
      persist(record);
      applyFinalStatus(record);
      return record;
    } catch (error) {
      const record = { ...live, status: 'failed', stopReason: 'error', steps:[...live.steps,{type:'error',message:error?.message}], endedAt: new Date().toISOString() };
      live.status = 'failed';
      renderRecordInto(taskNode, record);
      persist(record);
      applyFinalStatus(record);
      return record;
    } finally {
      controller = null;
      // Cancel (never merely forget) a pending approval: its buttons must not
      // survive the task or mutate the status of the next one.
      if (pendingApproval) { pendingApproval.cancel(); pendingApproval = null; }
      setBusy(false);
      announce(live.status === 'completed' ? 'done' : live.status === 'failed' ? 'error' : 'stopped');
    }
  }

  function renderRecordInto(taskNode, record) {
    setBadge(taskNode, record);
    for (const node of taskNode.querySelectorAll('[data-agent-step="model"][data-status="running"]')) node.dataset.status = record.status === 'failed' ? 'error' : record.status === 'completed' ? 'ok' : 'interrupted';
    renderAnswer(taskNode.querySelector('[data-agent-answer]'), record.answer || '');
    if (record.status === 'failed') {
      taskNode.querySelector('[data-agent-answer]').append(el('p', 'bear-agent__note', serviceMessage(record.steps?.findLast(s=>s.type==='error')?.message,zh)));
      addRetry(taskNode, record.question);
    } else if (record.status === 'interrupted') {
      taskNode.querySelector('[data-agent-answer]').append(el('p', 'bear-agent__note', t('任务被中断，没有标记为完成，也不会自动重跑。', 'The task was interrupted, not marked complete, and will not rerun automatically.')));
      addRetry(taskNode, record.question);
    }
  }

  function applyFinalStatus(record) {
    if (record.status === 'completed') {
      setStatus(t('任务完成。可以继续提问。', 'Task complete. Ask another question.'));
      return;
    }
    if (record.stopReason === 'aborted' || record.stopReason === 'timeout') {
      setStatus(t('已停止或超时。', 'Stopped or timed out.'));
      return;
    }
    if (record.stopReason === 'round-limit' || record.stopReason === 'tool-limit') {
      setStatus(t('任务达到了它的步骤上限，未标记为完成。', 'The task reached its step limit and was not marked complete.'));
      return;
    }
    setStatus(serviceMessage(record.steps?.findLast(s=>s.type==='error')?.message,zh));
  }

  // ── Restored history (last 12 records, interrupted stays interrupted) ─────
  for (const record of store.load()) renderRecord(record, { restored: true });

  // ── Composer ───────────────────────────────────────────────────────────────
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question || busy) return;
    input.value = '';
    runTask(question);
    input.focus({ preventScroll: true });
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  stop.addEventListener('click', () => {
    controller?.abort();
    if (pendingApproval) { pendingApproval.cancel(); pendingApproval = null; }
    setStatus(t('已停止或超时。', 'Stopped or timed out.'));
  });

  const voice = host.querySelector('[data-agent-voice]');
  const SpeechInput = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  voice.addEventListener('click',()=>{
    if (busy) return;
    if (!SpeechInput) { setStatus(t('这个浏览器暂不支持语音输入，请直接输入文字。','Voice input is unavailable in this browser. You can type instead.')); return; }
    if (recognition) { recognition.stop(); return; }
    const session = new SpeechInput(); recognition = session;
    session.lang = zh ? 'zh-CN' : 'en-US'; session.interimResults = true;
    const before = input.value;
    session.onresult = event => { if (!disposed) input.value = (before + Array.from(event.results).map(r=>r[0].transcript).join('')).slice(0,4000); };
    session.onerror = () => { if (!disposed) setStatus(t('没有收到语音，可以继续输入文字。','Voice input did not arrive. You can continue typing.')); };
    session.onend = () => { if(recognition===session)recognition=null;voice.removeAttribute('data-listening'); };
    voice.dataset.listening='true'; setStatus(t('正在听。结束后可编辑，再发送。','Listening. Edit the text before sending.'));
    try {session.start();} catch {session.onend();setStatus(t('语音输入没有启动，请直接输入文字。','Voice input could not start. You can type instead.'));}
  });

  // Prompt chips grounded in the public catalog.
  const chips = [];
  const product = (catalog?.products || [])[0];
  if (product?.name) chips.push({ label: t(`聊聊 ${product.name}`, `About ${product.name}`), question: t(`用三句话介绍 ${product.name}，并给我一个入口。`, `Introduce ${product.name} in three sentences and give me a link.`) });
  const latest = (catalog?.articles || [])[0];
  if (latest?.title) chips.push({ label: t('最近写了什么', 'What’s new'), question: t('最近写了什么？推荐一篇并说明为什么值得读。', 'What did you write recently? Recommend one piece and say why it is worth reading.') });
  const place = (catalog?.places || [])[0];
  if (place?.name) chips.push({ label: t(`聊聊 ${place.name}`, `About ${place.name}`), question: t(`讲讲 ${place.name} 的旅途，配一张照片。`, `Tell me about the trip to ${place.name}, with a photo.`) });
  if (chips.length) {
    const chipRow = el('div', 'bear-agent__chips');
    for (const chip of chips) {
      const button = el('button', 'bear-agent__chip', chip.label);
      button.type = 'button';
      button.addEventListener('click', () => { if (!busy) runTask(chip.question,{context:false}); });
      chipRow.append(button);
    }
    host.querySelector('.bear-agent__header').append(chipRow);
  }
  root.dataset.ready = 'true';

  return function dispose() {
    if (disposed) return;
    disposed = true;
    controller?.abort();
    recognition?.abort();
    workspace?.removeEventListener('bear:agent-prefill',prefill);
    announce('idle');
    if (pendingApproval) { pendingApproval.cancel(); pendingApproval = null; }
    host.replaceChildren();
  };
}

// Re-exported for wiring code and tests.
export { interpretRunResult, planAnswerSegments, buildPublicContext, escapeHTML };

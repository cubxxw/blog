// Small shared primitives: no DOM dependency, so transport and link handling
// can be tested against the exact code shipped by Hugo.
export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function safeLink(value, origin) {
  // Allow explicit HTTP(S) and site-relative paths, but never protocol-relative
  // URLs, backslashes, whitespace/control characters, or raw quote delimiters.
  if (!/^(https?:\/\/|\/(?!\/))/i.test(value) || /[\s\u0000-\u001f\u007f"'<>\\]/.test(value)) return null;
  try {
    const url = new URL(value, origin);
    return /^https?:$/.test(url.protocol) ? url.href : null;
  } catch { return null; }
}

function formatText(value) {
  return escapeHTML(value).replace(/\*\*([^*]{1,200})\*\*/g, '<strong>$1</strong>');
}

function inline(value, origin) {
  let result = '', cursor = 0;
  const links = /\[([^\]]{1,120})\]\(([^)]{1,400})\)/g;
  for (const match of value.matchAll(links)) {
    result += formatText(value.slice(cursor, match.index));
    const href = safeLink(match[2], origin);
    result += href ? '<a href="' + escapeHTML(href) + '" target="_blank" rel="noopener noreferrer" class="hp-ai-link">' + escapeHTML(match[1]) + ' ↗</a>' : escapeHTML(match[0]);
    cursor = match.index + match[0].length;
  }
  return result + formatText(value.slice(cursor));
}

export function renderMessage(value, origin) {
  const blocks = [], paragraph = [];
  function flush() {
    if (paragraph.length) blocks.push('<p class="hp-ai-para">' + paragraph.splice(0).join(' ') + '</p>');
  }
  for (const line of String(value).split(/\r?\n/)) {
    const card = line.match(/^\s*\[([^\]]{1,120})\]\(([^)]{1,400})\)\s*$/);
    const href = card && safeLink(card[2], origin);
    if (href) {
      flush();
      const path = new URL(href).pathname;
      blocks.push('<a href="' + escapeHTML(href) + '" target="_blank" rel="noopener noreferrer" class="hp-ai-card"><span class="hp-ai-card-icon" aria-hidden="true">↗</span><span class="hp-ai-card-body"><span class="hp-ai-card-title">' + escapeHTML(card[1]) + '</span><span class="hp-ai-card-path">' + escapeHTML(path) + '</span></span><span class="hp-ai-card-arrow" aria-hidden="true">↗</span></a>');
    } else if (!line.trim()) flush();
    else paragraph.push(inline(line, origin));
  }
  flush();
  return blocks.join('');
}

// Incremental UTF-8 + SSE framing. A chunk may end in the middle of a Chinese
// character, CRLF pair, JSON value, or event. Also flush unterminated last data.
export function createSSEParser(onData) {
  const decoder = new TextDecoder();
  let buffer = '', data = [], finished = false;
  function dispatch() {
    if (data.length) onData(data.join('\n'));
    data = [];
  }
  function line(value) {
    if (value === '') { dispatch(); return; }
    if (value === 'data') data.push('');
    else if (value.startsWith('data:')) data.push(value.slice(5).replace(/^ /, ''));
  }
  function drain(final) {
    let index;
    while ((index = buffer.search(/[\r\n]/)) !== -1) {
      if (!final && buffer[index] === '\r' && index === buffer.length - 1) break;
      const length = buffer[index] === '\r' && buffer[index + 1] === '\n' ? 2 : 1;
      line(buffer.slice(0, index));
      buffer = buffer.slice(index + length);
    }
    if (final) {
      if (buffer) line(buffer);
      buffer = '';
      dispatch();
    }
  }
  return {
    push(bytes) {
      if (finished) return;
      buffer += decoder.decode(bytes, { stream: true });
      drain(false);
    },
    finish() {
      if (finished) return;
      finished = true;
      buffer += decoder.decode();
      drain(true);
    },
  };
}

// Public objects only. Private workspace fields are never inspected here.
export function publicFocus(state, catalog) {
  const win = state?.windows?.find(w => w.id === state.active && !w.minimized);
  if (!win) return null;
  let item, kind, reference;
  if (win.app === 'reader') {
    item = [...(catalog?.articles || []), ...(catalog?.readingDocuments || [])].find(a => a.url === win.payload);
    kind = 'article'; reference = item?.url;
  } else if (win.app === 'products') {
    item = (catalog?.products || []).find(p => p.id === win.payload) || (!win.payload ? catalog?.products?.[0] : null);
    kind = 'product'; reference = item?.url || item?.id;
  } else if (win.app === 'photos') {
    item = (catalog?.photos || []).find(p => p.id === win.payload);
    kind = 'photo'; reference = item?.id;
  }
  return item && reference ? {kind,title:String(item.title || item.name || '').slice(0,200),reference:String(reference).slice(0,600)} : null;
}

export function contextualQuestion(question, focus, selection = '') {
  const text = String(question || '').trim();
  if (!focus) return text.slice(0,4000);
  const context = `\n\n[Public ${focus.kind}: ${focus.title}\nReference: ${focus.reference}${selection ? `\nSelected text: ${String(selection).slice(0,1200)}` : ''}]`;
  return text.slice(0,Math.max(0,4000-context.length)) + context;
}

export function serviceMessage(code, zh = true) {
  const messages = {
    'ai-rate-limited':['DeepSeek 当前限流，请稍后重试。','DeepSeek is rate limited. Please try again shortly.'],
    'ai-credit-exhausted':['DeepSeek 服务额度不足，需要补充额度。','The DeepSeek service needs additional credit.'],
    'ai-not-configured':['DeepSeek 服务尚未配置，请联系站点作者。','The DeepSeek service has not been configured yet.'],
    'ai-auth-failed':['DeepSeek 服务凭证未通过验证，需要更新配置。','The DeepSeek service credential needs updating.'],
    'ai-timeout':['DeepSeek 响应超时，可以重新试一次。','DeepSeek timed out. You can try again.'],
    'ai-network-error':['暂时无法连接 DeepSeek，请稍后重试。','Could not connect to DeepSeek. Please try again.'],
    'ai-output-truncated':['这次回答未能完整生成，可以缩小问题后重试。','This answer was cut short. Try a narrower question.'],
    'ai-unavailable':['DeepSeek 暂时未能回答，请稍后重试。','DeepSeek could not answer. Please try again.'],
  };
  return (messages[code] || messages['ai-unavailable'])[zh ? 0 : 1];
}

// Limited inline formatting; the renderer creates text nodes, never HTML.
export function planInlineText(value) {
  const text=String(value || ''), segments=[];
  const emphasis=/\*\*([^*\n]{1,240})\*\*/g;
  let offset=0;
  for(const match of text.matchAll(emphasis)) {
    if(match.index>offset)segments.push({kind:'text',text:text.slice(offset,match.index)});
    segments.push({kind:'strong',text:match[1]});offset=match.index+match[0].length;
  }
  if(offset<text.length)segments.push({kind:'text',text:text.slice(offset)});
  return segments;
}

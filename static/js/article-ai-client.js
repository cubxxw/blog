/* One transport for both article reading surfaces. No UI or history ownership. */
(function (global) {
  'use strict';
  async function request(payload, options) {
    options = options || {};
    var controller = new AbortController(), timer = null, timedOut = false, reader = null;
    var timeout = options.timeoutMs || 45000;
    var outer = options.signal;
    function abort() { controller.abort(); }
    function resetTimer() {
      clearTimeout(timer);
      timer = setTimeout(function () { timedOut = true; controller.abort(); }, timeout);
    }
    if (outer) {
      if (outer.aborted) abort();
      else outer.addEventListener('abort', abort, { once: true });
    }
    resetTimer();
    try {
      var response = await fetch('/.netlify/functions/article-ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: controller.signal
      });
      resetTimer();
      if (!response.ok) throw new Error('AI request failed (' + response.status + ')');
      if ((response.headers.get('content-type') || '').indexOf('text/event-stream') === -1) {
        var data = await response.json();
        if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        if (!data || typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('AI returned no answer');
        if (data.answer.length > 150000) throw new Error('AI answer exceeded the reading limit');
        return { answer: data.answer, candidates: Array.isArray(data.candidates) ? data.candidates : [] };
      }
      if (!response.body) throw new Error('AI returned no stream');
      reader = response.body.getReader();
      var decoder = new TextDecoder(), buffer = '', fields = [], answer = '', candidates = [], done = false;
      function event() {
        if (!fields.length) return;
        var value = fields.join('\n'); fields = [];
        if (value.trim() === '[DONE]') { done = true; return; }
        var parsed;
        try { parsed = JSON.parse(value); } catch (_) { throw new Error('Malformed AI stream'); }
        if (parsed.error) throw new Error(String(parsed.error));
        if (parsed.meta && Array.isArray(parsed.meta.candidates)) candidates = parsed.meta.candidates;
        var delta = parsed.delta;
        if (typeof delta === 'string' && delta) {
          answer += delta;
          if (answer.length > 150000) throw new Error('AI answer exceeded the reading limit');
          if (!controller.signal.aborted && typeof options.onDelta === 'function') options.onDelta(answer);
        }
      }
      function line(value) {
        value = value.replace(/\r$/, '');
        if (!value) event();
        else if (value.indexOf('data:') === 0) fields.push(value.slice(5).replace(/^ /, ''));
      }
      function consume(final) {
        var newline;
        while (!done && (newline = buffer.indexOf('\n')) !== -1) {
          var part = buffer.slice(0, newline); buffer = buffer.slice(newline + 1); line(part);
        }
        if (buffer.length > 250000) throw new Error('AI stream exceeded the reading limit');
        if (final && !done) { if (buffer) line(buffer); buffer = ''; event(); }
      }
      while (!done) {
        var chunk = await reader.read();
        if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        if (chunk.done) { buffer += decoder.decode(); consume(true); break; }
        resetTimer(); buffer += decoder.decode(chunk.value, { stream: true }); consume(false);
      }
      if (!answer.trim()) throw new Error('AI returned no answer');
      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      return { answer: answer, candidates: candidates };
    } catch (err) {
      if (timedOut) { var timeoutError = new Error('AI response timed out'); timeoutError.name = 'TimeoutError'; throw timeoutError; }
      throw err;
    } finally {
      clearTimeout(timer);
      if (outer) outer.removeEventListener('abort', abort);
      if (reader) {
        try { var cancellation = reader.cancel(); if (cancellation && cancellation.catch) cancellation.catch(function () {}); } catch (_) { /* already closed */ }
        try { reader.releaseLock(); } catch (_) { /* pending abort cleanup */ }
      }
    }
  }
  global.ArticleAIClient = { request: request };
})(window);

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function createGitJsonStore({ cwd = process.cwd(), statePath, validateState, message, exec = execFileSync }) {
  if (!/^config\/[a-z0-9-]+\.json$/.test(statePath) || typeof validateState !== 'function' || typeof message !== 'string') throw new Error('Invalid delivery state storage configuration');
  let expected;
  let loaded = false;
  const run = (args, options = {}) => exec('git', args, {
    cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...options,
  }).trim();
  const readRemote = () => {
    run(['fetch', '--no-tags', 'origin', '+refs/heads/main:refs/remotes/origin/main']);
    const parent = run(['rev-parse', 'refs/remotes/origin/main']);
    const present = run(['ls-tree', '--name-only', parent, '--', statePath]);
    const state = present ? JSON.parse(run(['show', `${parent}:${statePath}`])) : null;
    if (state !== null) validateState(state);
    return { parent, state };
  };
  const fingerprint = (state) => JSON.stringify(state);
  return {
    async load() {
      const { state } = readRemote();
      expected = state;
      loaded = true;
      return structuredClone(state);
    },
    async persist(state) {
      if (!loaded) throw new Error('Load the remote delivery state before persisting.');
      const nextState = validateState(state);
      const temp = mkdtempSync(join(tmpdir(), 'blog-newsletter-index-'));
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          const { parent, state: remote } = readRemote();
          if (fingerprint(remote) === fingerprint(nextState)) { expected = remote; return; }
          if (fingerprint(remote) !== fingerprint(expected)) throw new Error('Concurrent delivery state changed; reconcile before retrying.');
          const env = {
            ...process.env, GIT_INDEX_FILE: join(temp, 'index'),
            GIT_AUTHOR_NAME: 'github-actions[bot]', GIT_AUTHOR_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
            GIT_COMMITTER_NAME: 'github-actions[bot]', GIT_COMMITTER_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
          };
          run(['read-tree', parent], { env });
          const blob = run(['hash-object', '-w', '--stdin'], { input: JSON.stringify(nextState, null, 2) + '\n' });
          run(['update-index', '--add', '--cacheinfo', `100644,${blob},${statePath}`], { env });
          const tree = run(['write-tree'], { env });
          const commit = run(['commit-tree', tree, '-p', parent, '-m', message], { env });
          try {
            run(['push', 'origin', `${commit}:refs/heads/main`]);
            expected = structuredClone(nextState);
            return;
          } catch (cause) {
            // A lost push response may still have applied. The next fetch
            // proves the state before any provider operation is allowed.
            if (attempt === 2) {
              const { state: observed } = readRemote();
              if (fingerprint(observed) === fingerprint(nextState)) { expected = observed; return; }
              throw new Error('Delivery state push failed; no blind retry is safe.', { cause });
            }
          }
        }
      } finally {
        rmSync(temp, { recursive: true, force: true });
      }
    },
  };
}

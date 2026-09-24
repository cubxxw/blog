/**
 * test-support.ts — shared helpers for the interactive component suites
 * (not a test file). Storage-class write instrumentation used to prove the
 * components persist nothing, and screenshot paths under the env-specified
 * artifact root.
 */
import { mkdirSync } from 'node:fs';

/** Artifact root for screenshots (env-overridable, CI-portable). */
export const ARTIFACTS =
  process.env.INTERACTIVE_ARTIFACT_DIR && process.env.INTERACTIVE_ARTIFACT_DIR.trim()
    ? process.env.INTERACTIVE_ARTIFACT_DIR
    : 'tests/.artifacts';

export function shotPath(name: string, project: string): string {
  const dir = `${ARTIFACTS}/screenshots`;
  mkdirSync(dir, { recursive: true });
  return `${dir}/${name}-${project}.png`;
}

/**
 * Runs in the page from startup and records every storage-class write:
 * Web Storage, cookies, IndexedDB, Service Worker registration and history
 * mutations. Any write — known or unknown — fails the zero-write assertions
 * instead of being filtered away.
 */
export function instrumentation(): void {
  const w = window as unknown as { __writes: string[] };
  w.__writes = [];
  const rec = (kind: string, detail: string) => w.__writes.push(`${kind}:${detail}`);
  const origSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k: string, v: string) {
    rec('storage', String(k));
    return origSetItem.call(this, k, v);
  };
  const origOpen = indexedDB.open.bind(indexedDB);
  (indexedDB as unknown as { open: unknown }).open = (...args: unknown[]) => {
    rec('idb', String(args[0]));
    return (origOpen as (...a: unknown[]) => unknown)(...args);
  };
  if (navigator.serviceWorker) {
    const origReg = navigator.serviceWorker.register.bind(navigator.serviceWorker);
    (navigator.serviceWorker as unknown as { register: unknown }).register = (u: string) => {
      rec('sw', String(u));
      return origReg(u);
    };
  }
  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);
  history.pushState = ((...a: unknown[]) => {
    rec('history', 'push');
    return (origPush as (...x: unknown[]) => void)(...a);
  }) as typeof history.pushState;
  history.replaceState = ((...a: unknown[]) => {
    rec('history', 'replace');
    return (origReplace as (...x: unknown[]) => void)(...a);
  }) as typeof history.replaceState;
  const cookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
  if (cookieDesc && cookieDesc.set) {
    Object.defineProperty(Document.prototype, 'cookie', {
      configurable: true,
      get(this: Document) {
        return cookieDesc.get!.call(this);
      },
      set(this: Document, value: string) {
        rec('cookie', String(value));
        return cookieDesc.set!.call(this, value);
      },
    });
  }
}

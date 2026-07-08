// A tiny in-memory log store that mirrors console output and uncaught errors
// so they can be shown inside the app. This exists because the app is used on
// an iPad, where the browser devtools/console aren't reachable.

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id: number;
  level: LogLevel;
  time: string;
  message: string;
}

const MAX_ENTRIES = 300;

let entries: LogEntry[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Returns a stable reference until the entries actually change, so it can back
// useSyncExternalStore without tearing.
export function getEntries(): LogEntry[] {
  return entries;
}

export function clearEntries(): void {
  entries = [];
  emit();
}

function formatArg(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) {
    return arg.stack ?? `${arg.name}: ${arg.message}`;
  }
  if (arg === undefined) return 'undefined';
  if (arg === null) return 'null';
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function addEntry(level: LogLevel, args: unknown[]): void {
  const message = args.map(formatArg).join(' ').trim();
  if (message === '') return;
  const time = new Date().toLocaleTimeString();
  const next = entries.concat({ id: nextId++, level, time, message });
  entries = next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next;
  emit();
}

type ConsoleMethod = (...args: unknown[]) => void;

let installed = false;

// Patches console.* and installs global error handlers. Safe to call more than
// once; only the first call takes effect. Call as early as possible so errors
// during startup are captured too.
export function installDebugConsole(): void {
  if (installed) return;
  installed = true;

  const levels: LogLevel[] = ['log', 'info', 'warn', 'error', 'debug'];
  const consoleRecord = console as unknown as Record<string, ConsoleMethod>;

  for (const level of levels) {
    const original = consoleRecord[level].bind(console);
    consoleRecord[level] = (...args: unknown[]) => {
      addEntry(level, args);
      original(...args);
    };
  }

  window.addEventListener('error', event => {
    const location =
      event.filename !== '' ? ` (${event.filename}:${event.lineno}:${event.colno})` : '';
    const detail = event.error instanceof Error ? event.error : undefined;
    addEntry('error', [`${event.message}${location}`, ...(detail ? [detail] : [])]);
  });

  window.addEventListener('unhandledrejection', event => {
    addEntry('error', ['Unhandled promise rejection:', event.reason]);
  });
}

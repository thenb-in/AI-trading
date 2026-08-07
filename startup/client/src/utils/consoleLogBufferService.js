const STORAGE_KEY = 'help_support_console_logs';
const MAX_LOG_ENTRIES = 400;
const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'];
// Persisting on every console call meant re-serialising the whole buffer and
// doing a synchronous sessionStorage write per log line — O(buffer) work for
// each of them, and the app logs every API request. Writes are coalesced onto a
// timer instead, with a flush when the page goes away so nothing is lost.
const SAVE_DEBOUNCE_MS = 1000;
import { convertToISOString } from '@utils/dateTimeUtils';

class ConsoleLogBufferService {
  constructor() {
    this.started = false;
    this.originalConsole = {};
    this.entries = this.loadFromSessionStorage();
    this.saveTimer = null;
  }

  // Coalesce persistence: the in-memory buffer is always current, and the
  // sessionStorage copy catches up shortly after the logging settles.
  scheduleSave() {
    if (this.saveTimer || typeof window === 'undefined') return;
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      this.saveToSessionStorage();
    }, SAVE_DEBOUNCE_MS);
  }

  flush() {
    if (this.saveTimer && typeof window !== 'undefined') {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.saveToSessionStorage();
  }

  loadFromSessionStorage() {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  saveToSessionStorage() {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch {
      // Ignore quota/storage errors in client-only mode.
    }
  }

  normalizeArg(arg) {
    if (arg instanceof Error) {
      return `${arg.name}: ${arg.message}${arg.stack ? `\n${arg.stack}` : ''}`;
    }
    if (typeof arg === 'string') {
      return arg;
    }
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }

  pushEntry(level, args) {
    const message = args.map((arg) => this.normalizeArg(arg)).join(' ');
    const entry = {
      level,
      message,
      timestamp: convertToISOString(new Date()).split('T')[0],
      pathname: typeof window !== 'undefined' ? window.location.pathname : '',
      pageUrl: typeof window !== 'undefined' ? window.location.href : ''
    };
    this.entries.push(entry);
    if (this.entries.length > MAX_LOG_ENTRIES) {
      this.entries = this.entries.slice(this.entries.length - MAX_LOG_ENTRIES);
    }
    this.scheduleSave();
  }

  start() {
    if (this.started || typeof window === 'undefined') return;
    // A tab can be closed or hidden between debounce ticks; both are the last
    // chance to persist what has been logged.
    window.addEventListener('pagehide', this.flush.bind(this));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush();
    });
    CONSOLE_METHODS.forEach((method) => {
      const original = window.console?.[method];
      if (typeof original !== 'function') return;
      this.originalConsole[method] = original.bind(window.console);
      window.console[method] = (...args) => {
        this.pushEntry(method, args);
        this.originalConsole[method](...args);
      };
    });
    this.started = true;
  }

  getEntries() {
    return [...this.entries];
  }

  getLogsText() {
    return this.entries
      .map((entry) => `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`)
      .join('\n');
  }

  getLogsTextForPageUrl(pageUrl) {
    if (!pageUrl) return '';
    let pathname = '';
    try {
      pathname = new URL(pageUrl).pathname;
    } catch {
      pathname = pageUrl;
    }
    return this.entries
      .filter(
        (entry) =>
          (entry.pageUrl && entry.pageUrl === pageUrl) ||
          (!entry.pageUrl && entry.pathname === pathname)
      )
      .map((entry) => `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`)
      .join('\n');
  }
}

const consoleLogBufferService = new ConsoleLogBufferService();

export { consoleLogBufferService };

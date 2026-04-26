const STORAGE_KEY = 'help_support_console_logs';
const MAX_LOG_ENTRIES = 400;
const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'];
import { convertToISOString } from '@utils/dateTimeUtils';

class ConsoleLogBufferService {
  constructor() {
    this.started = false;
    this.originalConsole = {};
    this.entries = this.loadFromSessionStorage();
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
    this.saveToSessionStorage();
  }

  start() {
    if (this.started || typeof window === 'undefined') return;
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

import { useEffect, useRef } from 'react';
import { matchesShortcutDef, shortcutLabel } from '@utils/keyboardShortcut';

/**
 * Binds a declared shortcut (see `constants/shortcuts.js`) to a handler.
 *
 * Handlers for the same shortcut form a stack: only the most recently mounted
 * one fires, so a modal's Save wins over the page behind it. A page-level
 * shortcut also stands down while any dialog is open — Alt+N must never wipe
 * the record the user is editing in a modal.
 */

const handlerStacks = new Map();

const isTypingTarget = (target) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

const isDialogOpen = () => Boolean(document.querySelector('[role="dialog"]'));

const handleKeyDown = (event) => {
  if (event.repeat) return;

  const dialogOpen = isDialogOpen();

  for (const stack of handlerStacks.values()) {
    const entry = stack[stack.length - 1];
    if (!entry || !matchesShortcutDef(event, entry.shortcut)) continue;
    if (dialogOpen && !entry.inDialog) return;
    if (isTypingTarget(event.target) && !entry.shortcut.allowWhileTyping) return;

    event.preventDefault();
    entry.run(event);
    return;
  }
};

let registeredCount = 0;

const register = (entry) => {
  const key = shortcutLabel(entry.shortcut);
  const stack = handlerStacks.get(key) || [];
  // A fallback sits at the bottom of the stack: it only runs when nothing more
  // specific has claimed the shortcut.
  handlerStacks.set(key, entry.fallback ? [entry, ...stack] : [...stack, entry]);
  registeredCount += 1;
  if (registeredCount === 1) {
    document.addEventListener('keydown', handleKeyDown, true);
  }
};

const unregister = (entry) => {
  const key = shortcutLabel(entry.shortcut);
  const stack = (handlerStacks.get(key) || []).filter((e) => e !== entry);
  if (stack.length) handlerStacks.set(key, stack);
  else handlerStacks.delete(key);
  registeredCount -= 1;
  if (registeredCount === 0) {
    document.removeEventListener('keydown', handleKeyDown, true);
  }
};

const useShortcut = (shortcut, handler, { enabled = true, fallback = false } = {}) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled || !shortcut?.key || !handlerRef.current) return undefined;

    const entry = {
      shortcut,
      fallback,
      inDialog: isDialogOpen(),
      run: (event) => handlerRef.current?.(event),
    };
    register(entry);
    return () => unregister(entry);
  }, [shortcut, enabled, fallback]);
};

export { useShortcut };

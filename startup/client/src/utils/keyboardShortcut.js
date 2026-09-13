const MODIFIER_CODES = new Set([
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "ShiftLeft",
  "ShiftRight",
  "MetaLeft",
  "MetaRight",
]);

/** "KeyD" → "D", "Digit1" → "1", "F2" → "F2". */
const keyLabelFromCode = (code) => {
  if (code.startsWith("Key")) {
    return code.slice(3);
  }
  if (code.startsWith("Digit")) {
    return code.slice(5);
  }
  return code;
};


const formatShortcut = (event) => {
  if (!event?.code || MODIFIER_CODES.has(event.code)) {
    return null;
  }

  const parts = [];
  if (event.ctrlKey) {
    parts.push("Ctrl");
  }
  if (event.altKey) {
    parts.push("Alt");
  }
  if (event.shiftKey) {
    parts.push("Shift");
  }
  if (event.metaKey) {
    parts.push("Meta");
  }
  if (parts.length === 0) {
    return null;
  }

  parts.push(keyLabelFromCode(event.code));
  return parts.join("+");
};


const matchesShortcut = (event, shortcut) => {
  if (!shortcut) {
    return false;
  }
  return formatShortcut(event) === shortcut;
};


/* ------------------------------------------------------------------ *
 * Declared shortcuts (see constants/shortcuts.js)
 *
 * A combo is `{ mod?, alt?, shift?, key }`, where `key` is matched against
 * `event.code` ("KeyN") or `event.key` ("Enter", "F1"), and `mod` means Ctrl
 * on Windows/Linux and Cmd on macOS. Labels follow each platform's own
 * convention: "⌘S" on a Mac, "Ctrl+S" everywhere else.
 * ------------------------------------------------------------------ */

const isMacPlatform = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const platform = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || '';
  return /Mac|iPhone|iPad|iPod/i.test(platform);
};

/** Mac spells its modifiers with symbols and no separator; the rest spell them out. */
const MAC_MODIFIERS = { mod: '⌘', alt: '⌥', shift: '⇧' };
const PC_MODIFIERS = { mod: 'Ctrl', alt: 'Alt', shift: 'Shift' };
const MAC_KEYS = { Enter: '↩', Escape: 'Esc', Delete: '⌫', ArrowLeft: '←', ArrowRight: '→' };
const PC_KEYS = { Escape: 'Esc', ArrowLeft: '←', ArrowRight: '→' };

const comboKeyLabel = (key, mac) => {
  const named = mac ? MAC_KEYS[key] : PC_KEYS[key];
  return named || keyLabelFromCode(key);
};

const comboLabel = (combo) => {
  if (!combo?.key) {
    return '';
  }
  const mac = isMacPlatform();
  const modifiers = mac ? MAC_MODIFIERS : PC_MODIFIERS;
  const parts = ['mod', 'alt', 'shift'].filter((name) => combo[name]).map((name) => modifiers[name]);
  parts.push(comboKeyLabel(combo.key, mac));
  return parts.join(mac ? '' : '+');
};

/** All the ways a shortcut can be pressed — the declared combo first, then its alternates. */
const shortcutCombos = (shortcut) => (
  shortcut?.key ? [shortcut, ...(shortcut.alternates || [])] : []
);

/** "⌥S or ⌘K" — every combo that triggers the shortcut, in the platform's spelling. */
const shortcutLabel = (shortcut) => shortcutCombos(shortcut).map(comboLabel).filter(Boolean).join(' or ');

/** Tooltip text for a button: "Save (⌘S)". */
const shortcutTitle = (text, shortcut) => {
  const label = shortcutLabel(shortcut);
  return label ? `${text} (${label})` : text;
};

const matchesCombo = (event, combo) => {
  const mac = isMacPlatform();
  const modPressed = mac ? event.metaKey : event.ctrlKey;
  const otherModPressed = mac ? event.ctrlKey : event.metaKey;
  return (
    Boolean(combo.mod) === modPressed &&
    !otherModPressed &&
    Boolean(combo.alt) === event.altKey &&
    Boolean(combo.shift) === event.shiftKey &&
    (event.code === combo.key || event.key === combo.key)
  );
};

const matchesShortcutDef = (event, shortcut) =>
  shortcutCombos(shortcut).some((combo) => matchesCombo(event, combo));

export {
  formatShortcut,
  matchesShortcut,
  isMacPlatform,
  shortcutLabel,
  shortcutTitle,
  matchesShortcutDef,
};

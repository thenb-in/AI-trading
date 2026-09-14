import { useEffect } from 'react';

/**
 * Focuses the first usable field inside `containerRef` so a freshly opened
 * modal/form is ready to type into — UX first, one less click on every entry.
 *
 * `fillValue` also types into that field when it is an empty text box — what a
 * picker's "Create …" row had typed lands where the new record's entry starts.
 *
 * Fields often mount a frame or two after the dialog (async masters, lazy
 * sections), so the search retries each frame until one shows up or the
 * deadline passes. Anything that grabs focus first — a field carrying its own
 * `autoFocus`, or the user clicking straight into the form — wins.
 */

// Real entry controls only: buttons, links, the close icon and tick boxes are
// skipped so the caret always lands where the user is about to type.
const FIELD_SELECTOR = [
  'input:not([type="hidden"], [type="checkbox"], [type="radio"], [type="file"], [type="button"], [type="submit"], [type="reset"], [type="range"], [type="color"])',
  'textarea',
  'select',
  '[role="combobox"]',
  '[contenteditable="true"]',
]
  .map((selector) => `${selector}:not([disabled]):not([readonly]):not([aria-hidden="true"]):not([tabindex="-1"])`)
  .join(',');

// Plain typing boxes; a dropdown's search input is left alone so it does not start a search.
const TEXT_FIELD_SELECTOR = 'textarea, input:is([type="text"], [type="search"], :not([type])):not([role="combobox"])';

const isVisible = (element) => element.getClientRects().length > 0;

const findFirstField = (container) =>
  Array.from(container.querySelectorAll(FIELD_SELECTOR)).find(isVisible);

// React tracks a controlled input's value itself, so set it through the native
// setter and announce an input event — the form's onChange then sees the text.
const typeInto = (field, value) => {
  const { set } = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value');
  set.call(field, value);
  field.dispatchEvent(new Event('input', { bubbles: true }));
};

const focusAndFill = (field, fillValue) => {
  field.focus();
  if (fillValue && field.matches(TEXT_FIELD_SELECTOR) && field.value === '') typeInto(field, fillValue);
};

const useAutoFocusFirstField = (containerRef, { enabled = true, fillValue = '', timeoutMs = 800 } = {}) => {
  useEffect(() => {
    if (!enabled) return undefined;

    const deadline = Date.now() + timeoutMs;
    let frame = 0;

    const focusFirstField = () => {
      const container = containerRef.current;
      const focused = document.activeElement;
      const field = container?.contains(focused) && focused.matches(FIELD_SELECTOR)
        ? focused
        : container && findFirstField(container);
      if (field) {
        focusAndFill(field, fillValue);
        return;
      }

      if (Date.now() < deadline) frame = requestAnimationFrame(focusFirstField);
    };

    frame = requestAnimationFrame(focusFirstField);

    return () => cancelAnimationFrame(frame);
  }, [containerRef, enabled, fillValue, timeoutMs]);
};

export { useAutoFocusFirstField };

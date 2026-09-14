import { buildSyntheticChangeEvent } from '../utils/eventUtils';

/**
 * Shared event emitter for normalized values: handlers read `e.target.name`,
 * `e.target.value` and, for a checkbox, `e.target.checked`, as they would off a
 * native input.
 */
function emitChange(onChange, originalEvent, targetProps) {
  if (!onChange) return;
  onChange(buildSyntheticChangeEvent(originalEvent, targetProps));
}

export { emitChange };



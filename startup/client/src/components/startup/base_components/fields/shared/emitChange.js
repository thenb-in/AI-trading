import { buildSyntheticChangeEvent } from '../utils/eventUtils';

/**
 * Shared event emitter for normalized values.
 * Keeps compatibility with existing handlers expecting `e.target.name/value`.
 */
function emitChange(onChange, originalEvent, { name, id, value }) {
  if (!onChange) return;
  onChange(buildSyntheticChangeEvent(originalEvent, { name, id, value }));
}

export { emitChange };



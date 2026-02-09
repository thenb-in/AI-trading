/**
 * Event helpers
 * We keep TextField controlled (value + onChange). When we normalize, we emit an event-like object
 */

function buildSyntheticChangeEvent(originalEvent, { name, id, value }) {
  const eventTarget = originalEvent?.target || {};
  const eventCurrentTarget = originalEvent?.currentTarget || {};

  return {
    ...originalEvent,
    target: { ...eventTarget, name, id, value },
    currentTarget: { ...eventCurrentTarget, name, id, value }
  };
}

export { buildSyntheticChangeEvent };



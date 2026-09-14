/**
 * Event helpers
 */

// React keeps an event's methods on its prototype, which a spread leaves behind,
// so they are carried across explicitly. A clear button has no event to stop.
function buildSyntheticChangeEvent(originalEvent, nextTargetProps) {
  const eventTarget = originalEvent?.target || {};
  const eventCurrentTarget = originalEvent?.currentTarget || {};

  return {
    ...originalEvent,
    stopPropagation: () => originalEvent?.stopPropagation(),
    preventDefault: () => originalEvent?.preventDefault(),
    target: { ...eventTarget, ...(nextTargetProps || {}) },
    currentTarget: { ...eventCurrentTarget, ...(nextTargetProps || {}) }
  };
}

export { buildSyntheticChangeEvent };



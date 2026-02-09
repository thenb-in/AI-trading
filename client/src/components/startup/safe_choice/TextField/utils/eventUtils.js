/**
 * Event helpers
 */

function buildSyntheticChangeEvent(originalEvent, nextTargetProps) {
  const eventTarget = originalEvent?.target || {};
  const eventCurrentTarget = originalEvent?.currentTarget || {};

  return {
    ...originalEvent,
    target: { ...eventTarget, ...(nextTargetProps || {}) },
    currentTarget: { ...eventCurrentTarget, ...(nextTargetProps || {}) }
  };
}

export { buildSyntheticChangeEvent };



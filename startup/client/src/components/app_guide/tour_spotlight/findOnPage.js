const isVisible = (element) => {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

// The first element matching `selector` that is showing, or null while none is.
const findVisible = (selector) => [...document.querySelectorAll(selector)].find(isVisible) || null;

// The element carrying this `data-tour` anchor.
const findAnchor = (anchor) => findVisible(`[data-tour="${anchor}"]`);

// A step names its element either by CSS selector or by the `data-tour` anchor it points at.
const selectorOf = (step) => step.selector || `[data-tour="${step.fields || step.target}"]`;

// The element a step spotlights, once it is on screen.
const findStepTarget = (step) => findVisible(selectorOf(step));

export { findAnchor, findStepTarget, isVisible };

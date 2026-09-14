// A row's checkbox or radio only shows its state; the row's onClick owns selection.
const ignoreCheckboxChange = () => {};

/**
 * Menu rows in keyboard order: the options first, so Enter on a fresh search
 * picks the best match; then the accept row (keep what was typed); then the
 * create row. Counting both action rows is what makes them reachable by
 * keyboard — they are most needed exactly when nothing matched.
 */
const getMenuRowLayout = ({ hasAcceptRow, optionCount, hasCreateRow }) => {
  const acceptRowIndex = hasAcceptRow ? optionCount : -1;
  const createRowIndex = hasCreateRow ? optionCount + (hasAcceptRow ? 1 : 0) : -1;
  return {
    count: optionCount + (hasAcceptRow ? 1 : 0) + (hasCreateRow ? 1 : 0),
    isAcceptRow: (index) => index === acceptRowIndex,
    isCreateRow: (index) => index === createRowIndex,
  };
};

export { ignoreCheckboxChange, getMenuRowLayout };

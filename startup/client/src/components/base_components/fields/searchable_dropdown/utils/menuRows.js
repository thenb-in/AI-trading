// A row's checkbox or radio only shows its state; the row's onClick owns selection.
const ignoreCheckboxChange = () => {};

/**
 * Menu rows in keyboard order. The accept row above the options takes index 0
 * and pushes every option down by one; the create row is a virtual row past the
 * end of them. Counting both is what makes them reachable by keyboard — the
 * create row is most needed exactly when nothing matched and it is the only
 * row on screen.
 */
const getMenuRowLayout = ({ hasAcceptRow, optionCount, hasCreateRow }) => {
  const optionOffset = hasAcceptRow ? 1 : 0;
  const createRowIndex = hasCreateRow ? optionOffset + optionCount : -1;
  return {
    optionOffset,
    count: optionOffset + optionCount + (hasCreateRow ? 1 : 0),
    isAcceptRow: (index) => hasAcceptRow && index === 0,
    isCreateRow: (index) => index === createRowIndex,
  };
};

export { ignoreCheckboxChange, getMenuRowLayout };

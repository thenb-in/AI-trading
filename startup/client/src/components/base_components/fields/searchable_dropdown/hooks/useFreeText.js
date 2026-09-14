import { useMemo } from 'react';
import { isExactMatch } from '../utils/optionMatch';

/**
 * What was typed, as a value of its own (allowOptionsOutsideSelectBox).
 * `acceptText` is offered only when no option already matches it exactly (its
 * label, or any of its `searchKeys` such as an item code); `commitTypedText`
 * makes it the value — that matching option if there is one, otherwise the text.
 */
const useFreeText = ({ enabled, isTree, searchTerm, options, addValue }) => {
  const typedText = searchTerm.trim();
  const exactMatch = useMemo(() => {
    const needle = typedText.toLowerCase();
    return options.find((option) => isExactMatch(option, needle));
  }, [options, typedText]);

  const acceptText = enabled && !isTree && typedText !== '' && !exactMatch ? typedText : '';

  const commitTypedText = () => {
    if (!enabled || typedText === '') return;
    addValue(exactMatch ? exactMatch.value : typedText);
  };

  return { acceptText, commitTypedText };
};

export { useFreeText };

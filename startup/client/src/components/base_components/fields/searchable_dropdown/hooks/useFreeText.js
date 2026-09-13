import { useMemo } from 'react';

/**
 * What was typed, as a value of its own (allowOptionsOutsideSelectBox).
 * `acceptText` is offered only when no option already reads exactly that;
 * `commitTypedText` makes it the value — the matching option if one reads
 * exactly the typed text (ignoring case), otherwise the text itself.
 */
const useFreeText = ({ enabled, isTree, searchTerm, options, addValue }) => {
  const typedText = searchTerm.trim();
  const exactMatch = useMemo(() => {
    const needle = typedText.toLowerCase();
    return options.find((option) => option.label.toLowerCase() === needle);
  }, [options, typedText]);

  const acceptText = enabled && !isTree && typedText !== '' && !exactMatch ? typedText : '';

  const commitTypedText = () => {
    if (!enabled || typedText === '') return;
    addValue(exactMatch ? exactMatch.value : typedText);
  };

  return { acceptText, commitTypedText };
};

export { useFreeText };

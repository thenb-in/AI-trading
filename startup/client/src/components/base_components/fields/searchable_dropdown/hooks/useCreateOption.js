import { useCallback, useMemo } from 'react';

// Phrased from `optionName` unless the caller overrode it. Quoting the term is
// what makes the row read as a confirmation of what you typed.
const getCreateOptionText = ({ createOptionLabel, optionName, searchTerm }) => {
  if (typeof createOptionLabel === 'function') return createOptionLabel(searchTerm);
  if (typeof createOptionLabel === 'string' && createOptionLabel.trim() !== '') {
    return createOptionLabel;
  }
  const term = searchTerm.trim();
  const noun = (optionName || '').trim().toLowerCase();
  if (noun) return term ? `Create ${noun} "${term}"` : `Create a new ${noun}`;
  return term ? `Create "${term}"` : 'Add new';
};

/**
 * The create row at the foot of the menu, so a value that doesn't exist yet can
 * be created without leaving the form. No `onCreateOption`, no row.
 */
const useCreateOption = ({ onCreateOption, createOptionLabel, optionName, searchTerm, closeAfterPick }) => {
  const createOptionText = useMemo(
    () => (onCreateOption ? getCreateOptionText({ createOptionLabel, optionName, searchTerm }) : null),
    [onCreateOption, createOptionLabel, optionName, searchTerm]
  );

  const createFromSearch = useCallback(() => {
    onCreateOption(searchTerm.trim());
    closeAfterPick();
  }, [onCreateOption, searchTerm, closeAfterPick]);

  return { createOptionText, createFromSearch };
};

export { useCreateOption };

import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { UI_DEBOUNCE_DELAY } from '@/constants/ui';
import { TextTypeField } from './TextTypeField';
import { commonFieldPropTypes } from './shared/fieldPropTypes';
import { emitChange } from './shared/emitChange';
import { useFieldDisabled } from './shared/formEditable';

const DEFAULT_MAX_SUGGESTIONS_HEIGHT = 200;
const SUGGESTIONS_Z_INDEX = 100001;

/**
 * Text input with debounced API-backed suggestion dropdown.
 * Pass `fetchSuggestions(query, { signal })` — it should return `{ value, label }[]`.
 */
function AutocompleteTypeField({
  value = '',
  onChange,
  fetchSuggestions,
  debounceMs = UI_DEBOUNCE_DELAY,
  minQueryLength = 1,
  onSuggestionSelect,
  loadingMessage = 'Loading suggestions...',
  emptyMessage = 'No suggestions',
  errorMessage = 'Failed to load suggestions',
  maxSuggestionsHeight = DEFAULT_MAX_SUGGESTIONS_HEIGHT,
  disabled: disabledProp,
  name = '',
  id = '',
  ...fieldProps
}) {
  const disabled = useFieldDisabled(disabledProp);
  const inputId = id || name;
  const wrapperRef = useRef(null);
  const debouncedQuery = useDebouncedValue(value, debounceMs);

  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!fetchSuggestions || disabled) {
      return undefined;
    }

    const query = String(debouncedQuery ?? '').trim();
    if (query.length < minQueryLength) {
      setSuggestions([]);
      setLoading(false);
      setFetchError('');
      return undefined;
    }

    const abortController = new AbortController();
    let cancelled = false;

    const loadSuggestions = async () => {
      setLoading(true);
      setFetchError('');

      try {
        const results = await fetchSuggestions(query, { signal: abortController.signal });
        if (!cancelled) {
          setSuggestions(Array.isArray(results) ? results : []);
        }
      } catch (err) {
        if (!cancelled && err?.name !== 'AbortError') {
          setSuggestions([]);
          setFetchError(errorMessage);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSuggestions();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [debouncedQuery, fetchSuggestions, minQueryLength, disabled, errorMessage]);

  const trimmedQuery = String(value ?? '').trim();
  const hasQuery = trimmedQuery.length >= minQueryLength;
  const shouldShowPanel = open && !disabled && hasQuery;

  const handleFocus = useCallback(() => {
    if (!disabled && hasQuery) {
      setOpen(true);
    }
  }, [disabled, hasQuery]);

  const handleChange = useCallback(
    (event) => {
      onChange(event);
      setOpen(true);
    },
    [onChange]
  );

  const handleOptionMouseDown = useCallback(
    (event, option) => {
      event.preventDefault();

      const nextValue = option?.value ?? option?.label ?? '';
      emitChange(onChange, event, { name, id: inputId, value: nextValue });

      if (typeof onSuggestionSelect === 'function') {
        onSuggestionSelect(option);
      }

      setOpen(false);
    },
    [onChange, onSuggestionSelect, name, inputId]
  );

  const renderPanelContent = () => {
    if (loading) {
      return <div className="px-3 py-2 text-sm text-gray-400">{loadingMessage}</div>;
    }

    if (fetchError) {
      return <div className="px-3 py-2 text-sm text-red-500">{fetchError}</div>;
    }

    if (suggestions.length === 0) {
      return <div className="px-3 py-2 text-sm text-gray-400">{emptyMessage}</div>;
    }

    return suggestions.map((option) => {
      const optionKey = option?.value ?? option?.label;
  return (
        <div
          key={optionKey}
          onMouseDown={(event) => handleOptionMouseDown(event, option)}
          className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700"
        >
          {option?.label ?? option?.value}
        </div>
      );
    });
  };

  // Height depends on how many suggestions there are, so it can't be a class.
  const panelStyle = { zIndex: SUGGESTIONS_Z_INDEX, maxHeight: maxSuggestionsHeight };

  return (
    <div ref={wrapperRef} className="relative">
      <TextTypeField
        {...fieldProps}
        name={name}
        id={inputId}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        disabled={disabled}
        autoComplete="off"
      />

      {shouldShowPanel ? (
        <div
          className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-300 rounded shadow-lg overflow-y-auto"
          style={panelStyle}
        >
          {renderPanelContent()}
        </div>
      ) : null}
    </div>
  );
}

AutocompleteTypeField.propTypes = {
  ...commonFieldPropTypes,
  fetchSuggestions: PropTypes.func.isRequired,
  debounceMs: PropTypes.number,
  minQueryLength: PropTypes.number,
  onSuggestionSelect: PropTypes.func,
  loadingMessage: PropTypes.string,
  emptyMessage: PropTypes.string,
  errorMessage: PropTypes.string,
  maxSuggestionsHeight: PropTypes.number,
};

export { AutocompleteTypeField };

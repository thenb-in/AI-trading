import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import { FieldFrame } from './shared/FieldFrame';
import { commonFieldPropTypes } from './shared/fieldPropTypes';
import { MdiIcon } from '../MdiIcon';
import { useFieldDisabled, useFieldError } from './shared/formEditable';

/** How many matches the grid draws at once -- 6577 icons at once would stall the modal. */
const VISIBLE_LIMIT = 120;

/** One icon in the picker grid; its own component so the click handler is not built in JSX. */
function IconChoice({ name, isSelected, previewColor, onSelect }) {
  const handleClick = useCallback(() => onSelect(name), [onSelect, name]);

  return (
    <button
      type="button"
      title={name}
      onClick={handleClick}
      className={`flex h-9 items-center justify-center rounded-md hover:bg-blue-50 ${
        isSelected ? 'bg-blue-100 ring-1 ring-blue-400' : ''
      }`}
    >
      <MdiIcon name={name} size={20} color={previewColor} />
    </button>
  );
}

IconChoice.propTypes = {
  name: PropTypes.string.isRequired,
  isSelected: PropTypes.bool,
  previewColor: PropTypes.string,
  onSelect: PropTypes.func.isRequired
};


function IconTypeField({
  value = '',
  onChange,
  label = '',
  hint = '',
  error: errorProp = '',
  disabled: disabledProp,
  required = false,
  name = '',
  id = '',
  placeholder = 'Search icons, e.g. clock',
  previewColor,
  containerClassName = ''
}) {
  const disabled = useFieldDisabled(disabledProp);
  const error = useFieldError(name, errorProp);
  const inputId = id || name;
  const errorId = error ? `${inputId || 'icon'}-error` : undefined;
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [allNames, setAllNames] = useState([]);
  const [loadError, setLoadError] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen || allNames.length) {
      return;
    }
    let cancelled = false;
    import('./shared/mdiIconNames.json')
      .then((module) => {
        if (!cancelled) {
          setAllNames(module.default || []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(`Could not load the icon list. ${err.message}`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, allNames.length]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onDocumentClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, [isOpen]);

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    const pool = term ? allNames.filter((iconName) => iconName.includes(term)) : allNames;
    return { shown: pool.slice(0, VISIBLE_LIMIT), total: pool.length };
  }, [search, allNames]);

  const toggleOpen = useCallback(() => setIsOpen((open) => !open), []);
  const handleSearch = useCallback((event) => setSearch(event.target.value), []);

  const select = useCallback(
    (iconName) => {
      if (onChange) {
        onChange({ target: { name, value: iconName } });
      }
      setIsOpen(false);
      setSearch('');
    },
    [onChange, name]
  );

  return (
    <FieldFrame
      inputId={inputId}
      label={label}
      required={required}
      disabled={disabled}
      hint={hint}
      error={error}
      errorId={errorId}
      className={containerClassName}
    >
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          id={inputId}
          disabled={disabled}
          onClick={toggleOpen}
          className="flex w-full items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
        >
          <MdiIcon name={value} size={22} color={previewColor} />
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>
            {value || 'Choose an icon'}
          </span>
          <span className="mdi mdi-chevron-down ml-auto text-gray-400" aria-hidden="true" />
        </button>

        {isOpen ? (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
            <div className="border-b border-gray-100 p-2">
              <input
                type="text"
                autoFocus
                value={search}
                onChange={handleSearch}
                placeholder={placeholder}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {loadError ? <p className="p-3 text-sm text-red-500">{loadError}</p> : null}

            <div className="grid max-h-64 grid-cols-8 gap-1 overflow-y-auto p-2">
              {matches.shown.map((iconName) => (
                <IconChoice
                  key={iconName}
                  name={iconName}
                  isSelected={iconName === value}
                  previewColor={previewColor}
                  onSelect={select}
                />
              ))}
            </div>

            <p className="border-t border-gray-100 px-3 py-2 text-xs text-gray-500">
              {allNames.length === 0 && !loadError
                ? 'Loading icons...'
                : `Showing ${matches.shown.length} of ${matches.total} icons that work on web and in the mobile app`}
            </p>
          </div>
        ) : null}
      </div>
    </FieldFrame>
  );
}

IconTypeField.propTypes = {
  ...commonFieldPropTypes,
  onChange: PropTypes.func.isRequired,
  previewColor: PropTypes.string
};

export { IconTypeField };

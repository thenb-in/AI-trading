import { useCallback, useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';

import { BaseInputField } from './shared/BaseInputField';
import { commonFieldPropTypes } from './shared/fieldPropTypes';
import PropTypes from 'prop-types';


function FileTypeField(props) {
  const {
    onChange,
    name = '',
    id = '',
    icon = null,
    accept,
    multiple = false,
    capture,
    inputRef: forwardedInputRef,
    fileChangeMode,
    ...restProps
  } = props;

  const inputId = id || name;
  const localInputRef = useRef(null);
  const inputRef = forwardedInputRef || localInputRef;
  const [hasSelection, setHasSelection] = useState(false);
  const effectiveChangeMode = fileChangeMode || (multiple ? 'files' : 'file'); // 'native' | 'file' | 'files'

  const handleFileChange = useCallback(
    (e) => {
      const list = e?.target?.files;
      const count = list?.length || 0;
      setHasSelection(count > 0);

      if (!onChange) return;

      if (effectiveChangeMode === 'native') {
        onChange(e);
        return;
      }

      if (effectiveChangeMode === 'files') {
        onChange(Array.from(list || []));
        return;
      }

      // Default: single file (or null)
      onChange((list && list[0]) || null);
    },
    [onChange, effectiveChangeMode]
  );

  const handleClear = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    setHasSelection(false);

    if (!onChange) return;

    if (effectiveChangeMode === 'native') {
      // Emit a minimal event-like object so forms can react if they want.
      onChange({
        target: { name, id: inputId, value: '', files: [] },
        currentTarget: { name, id: inputId, value: '', files: [] },
      });
      return;
    }

    if (effectiveChangeMode === 'files') {
      onChange([]);
      return;
    }

    onChange(null);
  }, [onChange, name, inputId, inputRef, effectiveChangeMode]);

  return (
    <BaseInputField
      {...restProps}
      name={name}
      id={id}
      // File inputs must be uncontrolled
      includeValue={false}
      // Clear button should follow selection state, not `value`
      hasValueOverride={hasSelection}
      // For file input, consumers need the native event to access `e.target.files`
      onChangeMode="native"
      // Custom clear behavior uses ref
      onClear={handleClear}
      inputType="file"
      defaultIcon={icon || <Paperclip className="h-4 w-4 text-gray-400" />}
      clearAriaLabel="Clear file"
      // Ensure file attributes are forwarded even if caller doesn't pass them via restProps
      accept={accept}
      multiple={multiple}
      capture={capture}
      // Use a ref on the input to allow clearing
      inputRef={inputRef}
      onChange={handleFileChange}
    />
  );
}

FileTypeField.propTypes = {
  ...commonFieldPropTypes,
  inputRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  fileChangeMode: PropTypes.oneOf(['native', 'file', 'files']),
};

export { FileTypeField };



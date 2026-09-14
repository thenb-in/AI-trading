import { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { FieldFrame } from './shared/FieldFrame';
import { emitChange } from './shared/emitChange';
import { commonFieldPropTypes } from './shared/fieldPropTypes';
import { useFieldDisabled } from './shared/formEditable';

const DEFAULT_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    ['link', 'blockquote', 'code-block'],
    ['clean']
  ]
};

const DEFAULT_FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'bullet',
  'color',
  'background',
  'align',
  'link',
  'blockquote',
  'code-block'
];

function RichTextEditorField({
  value = '',
  onChange,
  label = '',
  error = '',
  disabled: disabledProp,
  required = false,
  name = '',
  id = '',
  placeholder = 'Write here...',
  className = '',
  containerClassName = '',
  modules = DEFAULT_MODULES,
  formats = DEFAULT_FORMATS,
  theme = 'snow',
  ...restProps
}) {
  const disabled = useFieldDisabled(disabledProp);
  const inputId = id || name;
  const errorId = error ? `${inputId || name || 'field'}-error` : undefined;

  const editorClassName = useMemo(() => {
    const base = `rounded-md border ${error ? 'border-red-500' : 'border-gray-300'} ${disabled ? 'bg-gray-100 opacity-70' : 'bg-white'}`;
    return `${base} ${className}`.trim();
  }, [className, disabled, error]);

  const handleChange = useCallback((content, delta, source, editor) => {
    const plainText = editor?.getText?.() || '';
    const normalizedValue = plainText.trim().length === 0 ? '' : content;
    emitChange(onChange, null, { name, id: inputId, value: normalizedValue });
  }, [id, inputId, name, onChange]);

  return (
    <FieldFrame
      inputId={inputId}
      label={label}
      required={required}
      error={error}
      errorId={errorId}
      className={containerClassName}
    >
      <div className={editorClassName}>
        <ReactQuill
          theme={theme}
          value={value || ''}
          onChange={handleChange}
          placeholder={placeholder}
          readOnly={disabled}
          modules={modules}
          formats={formats}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={errorId}
          {...restProps}
        />
      </div>
    </FieldFrame>
  );
}

RichTextEditorField.propTypes = {
  ...commonFieldPropTypes,
  modules: PropTypes.object,
  formats: PropTypes.arrayOf(PropTypes.string),
  theme: PropTypes.oneOf(['snow', 'bubble']),
};

export { RichTextEditorField };

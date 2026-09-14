import { useCallback, useState } from 'react';
import { Mail, X } from 'lucide-react';
import PropTypes from 'prop-types';

import { FieldFrame } from './shared/FieldFrame';
import { getBaseInputClasses } from './shared/getBaseInputClasses';
import { emitChange } from './shared/emitChange';
import { commonFieldPropTypes } from './shared/fieldPropTypes';
import { parseEmailList, isValidEmail, joinEmailList } from './utils/emailList';
import { useFieldDisabled } from './shared/formEditable';

/**
 * Multi-address email field. Type an address and press Enter (or comma, or
 * click Add) to turn it into a removable chip.
 *
 * The value stays a single comma-separated string in and out, so callers keep
 * their ordinary `e.target.name/value` change handlers and payload builders.
 */
function EmailListTypeField({
  value = '',
  onChange,
  label = '',
  placeholder = 'Enter email and press Enter',
  error = '',
  disabled: disabledProp,
  required = false,
  className = '',
  name = 'email',
  id = '',
  addButtonLabel = 'Add'
}) {
  const disabled = useFieldDisabled(disabledProp);
  const inputId = id || name;
  const errorId = error ? `${inputId}-error` : undefined;
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState('');

  const emails = parseEmailList(value);

  const commit = useCallback((nextEmails) => {
    emitChange(onChange, null, { name, id: inputId, value: joinEmailList(nextEmails) });
  }, [onChange, name, inputId]);

  /** Adds the draft; returns true when it was consumed so callers can stop. */
  const addDraft = useCallback(() => {
    const candidate = draft.trim();
    if (!candidate) {
      setDraftError('');
      return true;
    }
    // Handles a pasted list in one go, not just a single address.
    const candidates = parseEmailList(candidate);
    const invalid = candidates.filter((entry) => !isValidEmail(entry));
    if (invalid.length) {
      setDraftError(`Enter a valid email address: ${invalid.join(', ')}`);
      return false;
    }
    const existing = new Set(emails.map((entry) => entry.toLowerCase()));
    const fresh = candidates.filter((entry) => !existing.has(entry.toLowerCase()));
    if (!fresh.length) {
      setDraftError('Email already added');
      return false;
    }
    commit([...emails, ...fresh]);
    setDraft('');
    setDraftError('');
    return true;
  }, [draft, emails, commit]);

  const removeEmail = useCallback((index) => {
    commit(emails.filter((_, i) => i !== index));
  }, [emails, commit]);

  const handleDraftChange = useCallback((event) => {
    setDraft(event.target.value);
    setDraftError('');
  }, []);

  const handleKeyDown = useCallback((event) => {
    // Enter must not submit the surrounding form while adding a chip.
    if (event.key === 'Enter' || event.key === ',' || event.key === ';') {
      event.preventDefault();
      addDraft();
    }
  }, [addDraft]);

  // Commit on blur so a typed address is never silently lost on save.
  const handleBlur = useCallback(() => {
    addDraft();
  }, [addDraft]);

  const shownError = error || draftError;

  return (
    <FieldFrame
      inputId={inputId}
      label={label}
      required={required}
      disabled={disabled}
      error={shownError}
      errorId={errorId}
    >
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Mail className="h-4 w-4 text-gray-400" />
          </span>
          <input
            id={inputId}
            name={`${name}Draft`}
            type="email"
            inputMode="email"
            value={draft}
            onChange={handleDraftChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={Boolean(shownError) || undefined}
            aria-describedby={errorId}
            className={`${getBaseInputClasses({ error: shownError, disabled, className })} pl-10 pr-3`.trim()}
          />
        </div>
        <button
          type="button"
          onClick={addDraft}
          disabled={disabled || !draft.trim()}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {addButtonLabel}
        </button>
      </div>

      {emails.length > 0 ? (
        <div className="flex flex-wrap gap-2 mt-2">
          {emails.map((email, index) => (
            <span
              key={email}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-700"
            >
              {email}
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => removeEmail(index)}
                  aria-label={`Remove ${email}`}
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </FieldFrame>
  );
}

EmailListTypeField.propTypes = {
  ...commonFieldPropTypes,
  addButtonLabel: PropTypes.string
};

export { EmailListTypeField };

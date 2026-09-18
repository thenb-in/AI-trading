import { EmailTypeField } from '@startup/components/base_components/fields/EmailTypeField';
import { PhoneTypeField } from '@startup/components/base_components/fields/PhoneTypeField';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { useState } from 'react';
import PropTypes from 'prop-types';
import { BaseModal } from '@startup/components/base_components/master';
import { useAvailabilityCheck } from '@startup/hooks/useAvailabilityCheck';
import { AvailabilityHint } from '@startup/components/common/AvailabilityHint';


const FIELD_CONFIG = {
  name: { label: 'Name', Input: TextTypeField, placeholder: 'Full name' },
  phone: { label: 'Phone', Input: PhoneTypeField, placeholder: 'Phone number' },
  username: { label: 'Username', Input: TextTypeField, placeholder: 'Username' },
  email: { label: 'Email', Input: EmailTypeField, placeholder: 'name@company.com' },
};

function EditFieldModal({ field, initialValue, onSave, onClose, label, placeholder, title, saveLabel, allowUnchanged = false }) {
  const cfg = FIELD_CONFIG[field] || { label: label || field, Input: TextTypeField, placeholder };
  const [value, setValue] = useState(initialValue ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const isUsername = field === 'username';
  const trimmed = value.trim();
  const unchanged = isUsername
    ? trimmed.toLowerCase() === (initialValue ?? '').trim().toLowerCase()
    : trimmed === (initialValue ?? '').trim();

  // Only hit the availability endpoint when the username actually changed.
  const availability = useAvailabilityCheck('username', isUsername && !unchanged ? value : '');
  const showHint = isUsername && !unchanged;
  const usernameBlocked = showHint && (availability.status === 'taken' || availability.status === 'checking');

  const canSave = trimmed.length > 0 && (allowUnchanged || !unchanged) && !usernameBlocked && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError('');
    try {
      await onSave(isUsername ? trimmed.toLowerCase() : trimmed);
      onClose();
    } catch (err) {
      setSaveError(err?.error || err?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => setValue(e.target.value);
  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSave(); };

  const actions = (
    <>
      <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
        Cancel
      </button>
      <button
        onClick={handleSave}
        disabled={!canSave}
        className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Saving…' : (saveLabel || 'Save')}
      </button>
    </>
  );

  return (
    <BaseModal
      isOpen
      onClose={onClose}
      title={title || `Edit ${cfg.label}`}
      maxWidth="xs"
      showAudit={false}
      actions={actions}
    >
      <cfg.Input
        label={label || cfg.label}
        autoFocus
        value={value}
        placeholder={cfg.placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {showHint && <AvailabilityHint status={availability.status} takenLabel="This username is already taken." />}
      {saveError && <p className="mt-1.5 text-xs font-medium text-red-600">{saveError}</p>}
    </BaseModal>
  );
}

EditFieldModal.propTypes = {
  field: PropTypes.string.isRequired,
  initialValue: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  title: PropTypes.string,
  saveLabel: PropTypes.string,
  allowUnchanged: PropTypes.bool,
};

export { EditFieldModal };

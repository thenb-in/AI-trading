import { useState } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { useAvailabilityCheck } from '@startup/hooks/useAvailabilityCheck';
import { AvailabilityHint } from '@startup/components/common/AvailabilityHint';


const FIELD_CONFIG = {
  name: { label: 'Name', type: 'text', placeholder: 'Full name' },
  phone: { label: 'Phone', type: 'tel', placeholder: 'Phone number' },
  username: { label: 'Username', type: 'text', placeholder: 'Username' },
  email: { label: 'Email', type: 'email', placeholder: 'name@company.com' },
};

function EditFieldModal({ field, initialValue, onSave, onClose, label, placeholder, title, saveLabel, allowUnchanged = false }) {
  const cfg = FIELD_CONFIG[field] || { label: label || field, type: 'text', placeholder };
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
  const stopPropagation = (e) => e.stopPropagation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl" onClick={stopPropagation}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800">{title || `Edit ${cfg.label}`}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <label className="mb-1 block text-xs font-medium text-gray-500">{label || cfg.label}</label>
        <input
          autoFocus
          type={cfg.type}
          value={value}
          placeholder={cfg.placeholder}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        {showHint && <AvailabilityHint status={availability.status} takenLabel="This username is already taken." />}
        {saveError && <p className="mt-1.5 text-xs font-medium text-red-600">{saveError}</p>}

        <div className="mt-5 flex justify-end gap-2">
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
        </div>
      </div>
    </div>
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

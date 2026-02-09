import { useState } from 'react';
import PropTypes from 'prop-types';
import { ToggleSwitch } from '../../ToggleSwitch';
import { AlertMessage } from '../../RolePermissions/components/AlertMessage';
import { TextField } from '@startup/safe_choice';

const sanitizeName = (value) => value.replace(/[<>&]/g, '').slice(0, 80);
const sanitizeCompanyId = (value) => value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);

const CompanyCreateForm = ({ onCreate, creating, createError }) => {
  const [form, setForm] = useState({ name: '', companyId: '', mobileApp: false, desktopWeb: true, mobileWeb: false });
  const [touched, setTouched] = useState(false);

  const isValid = form.name.trim().length >= 2;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    await onCreate(form);
    setForm({ name: '', companyId: '', mobileApp: false, desktopWeb: true, mobileWeb: false });
    setTouched(false);
  };

  const handleNameChange = (e) => {
    setForm((f) => ({ ...f, name: sanitizeName(e.target.value) }));
  };

  const handleCompanyIdChange = (e) => {
    setForm((f) => ({ ...f, companyId: sanitizeCompanyId(e.target.value) }));
  };

  const handleMobileAppChange = (e) => {
    setForm((f) => ({ ...f, mobileApp: e.target.checked }));
  };

  const handleDesktopWebChange = (e) => {
    setForm((f) => ({ ...f, desktopWeb: e.target.checked }));
  };

  const handleMobileWebChange = (e) => {
    setForm((f) => ({ ...f, mobileWeb: e.target.checked }));
  };

  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Create Company</h2>
      <p className="text-sm text-gray-600 mb-4">Add a new company and configure device access.</p>

      {createError && (
        <div className="mb-4">
          <AlertMessage type="error" message={String(createError)} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-4">
       <div>
          <TextField
            type="text"
            placeholder="Company ID (optional - will be auto-generated if not provided)"
            value={form.companyId}
            onChange={handleCompanyIdChange}
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate a unique ID. If provided, must be at least 2 characters (letters, numbers, underscores, hyphens only).</p>
        </div>
        <div>
          <TextField
            type="text"
            placeholder="Company name"
            value={form.name}
            onChange={handleNameChange}
            error={touched && form.name.trim().length < 2 ? 'Name must be at least 2 characters.' : ''}
          />
        </div>

       

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ToggleSwitch
            label="Mobile App"
            checked={form.mobileApp}
            onChange={handleMobileAppChange}
            description="Allow access via native mobile app."
          />
          <ToggleSwitch
            label="Desktop Web"
            checked={form.desktopWeb}
            onChange={handleDesktopWebChange}
            description="Allow access via desktop browser."
          />
          <ToggleSwitch
            label="Mobile Web"
            checked={form.mobileWeb}
            onChange={handleMobileWebChange}
            description="Allow access via mobile browser."
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {creating ? 'Creating...' : 'Create Company'}
          </button>
        </div>
      </form>
    </div>
  );
};

CompanyCreateForm.propTypes = {
  onCreate: PropTypes.func.isRequired,
  creating: PropTypes.bool,
  createError: PropTypes.any,
};

export { CompanyCreateForm };



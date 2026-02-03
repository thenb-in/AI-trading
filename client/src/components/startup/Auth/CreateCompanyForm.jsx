import { useState } from 'react';
import PropTypes from 'prop-types';
import { ToggleSwitch } from '../Admin/ToggleSwitch';

const sanitizeName = (value) => value.replace(/[<>&]/g, '').slice(0, 80);

const CreateCompanyForm = ({ onSubmit, isSubmitting, error }) => {
  const [form, setForm] = useState({ 
    name: '', 
    mobileApp: false, 
    desktopWeb: true, 
    mobileWeb: false 
  });
  const [touched, setTouched] = useState(false);

  const isValid = form.name.trim().length >= 2;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    await onSubmit(form);
  };

  const handleNameChange = (e) => {
    setForm((f) => ({ ...f, name: sanitizeName(e.target.value) }));
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Company Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Enter company name"
          value={form.name}
          onChange={handleNameChange}
          required
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            touched && form.name.trim().length < 2 ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {touched && form.name.trim().length < 2 && (
          <p className="text-xs text-red-600 mt-1">Company name must be at least 2 characters.</p>
        )}
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Device Access
        </label>
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

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting || !isValid}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {isSubmitting ? 'Creating...' : 'Create Company'}
        </button>
      </div>
    </form>
  );
};

CreateCompanyForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
  error: PropTypes.string,
};

export { CreateCompanyForm };


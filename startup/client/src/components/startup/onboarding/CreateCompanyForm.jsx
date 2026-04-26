import PropTypes from 'prop-types';
import { ToggleSwitch } from '../admin/ToggleSwitch';
import { TextTypeField } from '@base_components/fields/TextTypeField';
import { useCompanyForm } from '@/hooks/useCompanyForm';

const CreateCompanyForm = ({ onSubmit, isSubmitting, error }) => {
  const {
    form,
    touched,
    isValid,
    handleNameChange,
    handleToggleChange,
    handleSubmit,
  } = useCompanyForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div>
        <TextTypeField
          label="Company Name"
          placeholder="Enter company name"
          value={form.name}
          onChange={handleNameChange}
          required
          error={touched && form.name.trim().length < 2 ? 'Company name must be at least 2 characters.' : ''}
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Device Access
        </label>
        <ToggleSwitch
          label="Mobile App"
          checked={form.mobileApp}
          onChange={handleToggleChange('mobileApp')}
          description="Allow access via native mobile app."
        />
        <ToggleSwitch
          label="Desktop Web"
          checked={form.desktopWeb}
          onChange={handleToggleChange('desktopWeb')}
          description="Allow access via desktop browser."
        />
        <ToggleSwitch
          label="Mobile Web"
          checked={form.mobileWeb}
          onChange={handleToggleChange('mobileWeb')}
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

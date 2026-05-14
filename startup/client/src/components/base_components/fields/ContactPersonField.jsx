import PropTypes from 'prop-types';
import { TextTypeField } from './TextTypeField';
import { PhoneTypeField } from './PhoneTypeField';
import { EmailTypeField } from './EmailTypeField';

/**
 * Compound field for capturing a contact person's name + phone + email.
 * Used for alternate contact, nominee, etc.
 *
 * The parent owns the storage shape; this component just emits change events
 * keyed by 'name' / 'phone' / 'email'. The parent maps those to its own
 * column names (e.g. nominee_name / alternate_contact_name).
 */
function ContactPersonField({
  label,
  values = {},
  onChange,
  disabled = false,
  required = false,
  namePlaceholder = 'Name',
  phonePlaceholder = 'Phone',
  emailPlaceholder = 'Email',
}) {
  const handleNameChange = (e) => onChange('name', e.target.value);
  const handlePhoneChange = (e) => onChange('phone', e.target.value);
  const handleEmailChange = (e) => onChange('email', e.target.value);

  return (
    <div className="space-y-2">
      {label && (
        <h6 className="text-sm font-semibold text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </h6>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <TextTypeField
          name="contact_person_name"
          label="Name"
          placeholder={namePlaceholder}
          value={values.name ?? ''}
          onChange={handleNameChange}
          disabled={disabled}
          required={required}
        />
        <PhoneTypeField
          name="contact_person_phone"
          label="Phone"
          placeholder={phonePlaceholder}
          value={values.phone ?? ''}
          onChange={handlePhoneChange}
          disabled={disabled}
        />
        <EmailTypeField
          name="contact_person_email"
          label="Email"
          placeholder={emailPlaceholder}
          value={values.email ?? ''}
          onChange={handleEmailChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

ContactPersonField.propTypes = {
  label: PropTypes.string,
  values: PropTypes.shape({
    name: PropTypes.string,
    phone: PropTypes.string,
    email: PropTypes.string,
  }),
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  namePlaceholder: PropTypes.string,
  phonePlaceholder: PropTypes.string,
  emailPlaceholder: PropTypes.string,
};

export { ContactPersonField };
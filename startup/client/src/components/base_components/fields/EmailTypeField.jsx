import { Mail } from 'lucide-react';
import { BaseInputField } from './shared/BaseInputField';
import { commonFieldPropTypes } from './shared/fieldPropTypes';

function normalizeEmail(rawValue) {
  return String(rawValue ?? '').replace(/\s+/g, '');
}

/** No custom `pattern`: native `type="email"` allows common multi-part domains; a strict pattern rejected e.g. user@sub.example.com. */
function EmailTypeField(props) {
  return (
    <BaseInputField
      {...props}
      inputType="email"
      inputMode="email"
      pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
      normalize={normalizeEmail}
      defaultIcon={<Mail className="h-4 w-4 text-gray-400" />}
      clearAriaLabel="Clear email"
    />
  );
}

EmailTypeField.propTypes = {
  ...commonFieldPropTypes,
};

export { EmailTypeField };



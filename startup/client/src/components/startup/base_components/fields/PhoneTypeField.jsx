import { Phone } from 'lucide-react';
import { BaseInputField } from './shared/BaseInputField';
import { commonFieldPropTypes } from './shared/fieldPropTypes';

function normalizePhone(rawValue) {
  let next = String(rawValue ?? '').replace(/[^\d+]/g, '');
  if (next.includes('+')) {
    next = (next.startsWith('+') ? '+' : '') + next.replace(/\+/g, '');
  }
  // E.164 max: 15 digits + optional '+'
  const maxLen = 16;
  if (next.length > maxLen) {
    next = next.slice(0, maxLen);
  }
  return next;
}

function PhoneTypeField(props) {
  return (
    <BaseInputField
      {...props}
      inputType="tel"
      inputMode="tel"
      pattern="[0-9+]*"
      normalize={normalizePhone}
      defaultIcon={<Phone className="h-4 w-4 text-gray-400" />}
      clearAriaLabel="Clear phone"
    />
  );
}

PhoneTypeField.propTypes = {
  ...commonFieldPropTypes,
};

export { PhoneTypeField };



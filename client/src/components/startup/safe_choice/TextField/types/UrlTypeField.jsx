import { Link as LinkIcon } from 'lucide-react';
import { BaseInputField } from '../shared/BaseInputField';
import { commonFieldPropTypes } from '../shared/fieldPropTypes';

function normalizeUrl(rawValue) {
  return String(rawValue ?? '').trim();
}

function UrlTypeField(props) {
  return (
    <BaseInputField
      {...props}
      inputType="url"
      inputMode="url"
      normalize={normalizeUrl}
      defaultIcon={<LinkIcon className="h-4 w-4 text-gray-400" />}
      clearAriaLabel="Clear url"
    />
  );
}

UrlTypeField.propTypes = {
  ...commonFieldPropTypes,
};

export { UrlTypeField };



import PropTypes from 'prop-types';

import { TextTypeField } from './types/TextTypeField';
import { SearchTypeField } from './types/SearchTypeField';
import { EmailTypeField } from './types/EmailTypeField';
import { UrlTypeField } from './types/UrlTypeField';
import { PhoneTypeField } from './types/PhoneTypeField';
import { PasswordTypeField } from './types/PasswordTypeField';
import { TextareaTypeField } from './types/TextareaTypeField';
import { DescriptionTypeField } from './types/DescriptionTypeField';
import { OtpTypeField } from './types/OtpTypeField';
import { NumberTypeField } from './types/NumberTypeField';
import { FileTypeField } from './types/FileTypeField';
import { CheckboxTypeField } from './types/CheckboxTypeField';
import { RadioTypeField } from './types/RadioTypeField';
import { DateTypeField } from './types/DateTypeField';
import { DateTimeTypeField } from './types/DateTimeTypeField';

const TextField = ({
  type = 'text',
  value = '',
  checked = undefined,
  onChange,
  placeholder = '',
  label = '',
  error = '',
  disabled = false,
  required = false,
  className = '',
  name = '',
  id = '',
  autoFocus = false,
  maxLength = null,
  minLength = null,
  rows = 4,
  otpLength = 6,
  showClearButton = false,
  icon = null,
  sanitize = false,
  ...restProps
}) => {
  const commonProps = {
    type,
    value,
    ...(type === 'checkbox' || type === 'radio' ? { checked } : {}),
    onChange,
    placeholder,
    label,
    error,
    disabled,
    required,
    className,
    name,
    id,
    autoFocus,
    maxLength,
    minLength,
    rows,
    otpLength,
    showClearButton,
    icon,
    sanitize,
    ...restProps,
  };

  // Dispatcher only: each type owns its own logic + UI in its own file.
  switch (type) {
    case 'otp':
      return <OtpTypeField {...commonProps} />;
    case 'textarea':
      return <TextareaTypeField {...commonProps} />;
    case 'description':
      return <DescriptionTypeField {...commonProps} />;
    case 'checkbox':
      return <CheckboxTypeField {...commonProps} />;
    case 'radio':
      return <RadioTypeField {...commonProps} />;
    case 'date':
      return <DateTypeField {...commonProps} />;
    case 'datetime':
      return <DateTimeTypeField {...commonProps} />;
    case 'file':
      return <FileTypeField {...commonProps} />;
    case 'number':
      return <NumberTypeField {...commonProps} />;
    case 'email':
      return <EmailTypeField {...commonProps} />;
    case 'password':
      return <PasswordTypeField {...commonProps} />;
    case 'phone':
      return <PhoneTypeField {...commonProps} />;
    case 'search':
      return <SearchTypeField {...commonProps} />;
    case 'url':
      return <UrlTypeField {...commonProps} />;
    case 'text':
    default:
      return <TextTypeField {...commonProps} />;
  }
};

TextField.propTypes = {
  type: PropTypes.oneOf(['text', 'textarea', 'email', 'password', 'otp', 'phone', 'search', 'url', 'description', 'number', 'file', 'checkbox', 'radio', 'date', 'datetime-local']),
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  checked: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  label: PropTypes.string,
  error: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  className: PropTypes.string,
  name: PropTypes.string,
  id: PropTypes.string,
  autoFocus: PropTypes.bool,
  maxLength: PropTypes.number,
  minLength: PropTypes.number,
  rows: PropTypes.number,
  otpLength: PropTypes.number,
  showClearButton: PropTypes.bool,
  icon: PropTypes.node,
  sanitize: PropTypes.bool,
};

export { TextField };


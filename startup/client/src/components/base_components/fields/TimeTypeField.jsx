import { Clock } from 'lucide-react';
import { BaseInputField } from './shared/BaseInputField';
import { commonFieldPropTypes } from './shared/fieldPropTypes';

/**
 * Native time input (HH:MM, 24h wire format).
 * `type="time"` already constrains typing, so no normalizer is needed — the
 * browser never emits a partial value through onChange.
 */
function TimeTypeField(props) {
  return (
    <BaseInputField
      {...props}
      inputType="time"
      onChangeMode="native"
      defaultIcon={<Clock className="h-4 w-4 text-gray-400" />}
      clearAriaLabel="Clear time"
    />
  );
}

TimeTypeField.propTypes = {
  ...commonFieldPropTypes,
};

export { TimeTypeField };

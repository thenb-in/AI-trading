import { BaseInputField } from './shared/BaseInputField';
import { commonFieldPropTypes } from './shared/fieldPropTypes';

/**
 * A date and a time in one field
 */
function DateTimeTypeField(props) {
  return <BaseInputField {...props} inputType="datetime-local" onChangeMode="native" />;
}

DateTimeTypeField.propTypes = {
  ...commonFieldPropTypes,
};

export { DateTimeTypeField };

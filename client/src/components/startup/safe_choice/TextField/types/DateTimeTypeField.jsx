import { BaseInputField } from '../shared/BaseInputField';
import { commonFieldPropTypes } from '../shared/fieldPropTypes';

function DateTimeTypeField(props) {
  return (
    <BaseInputField
      {...props}
      inputType="datetime-local"
      clearAriaLabel="Clear date and time"
    />
  );
}

DateTimeTypeField.propTypes = {
  ...commonFieldPropTypes,
};

export { DateTimeTypeField };



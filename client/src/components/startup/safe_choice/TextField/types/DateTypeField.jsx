import { BaseInputField } from '../shared/BaseInputField';
import { commonFieldPropTypes } from '../shared/fieldPropTypes';

function DateTypeField(props) {
  return (
    <BaseInputField
      {...props}
      inputType="date"
      clearAriaLabel="Clear date"
    />
  );
}

DateTypeField.propTypes = {
  ...commonFieldPropTypes,
};

export { DateTypeField };



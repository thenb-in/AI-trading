import { BaseInputField } from '../shared/BaseInputField';
import { commonFieldPropTypes } from '../shared/fieldPropTypes';

function TextareaTypeField(props) {
  return (
    <BaseInputField
      {...props}
      as="textarea"
      clearAriaLabel="Clear textarea"
    />
  );
}

TextareaTypeField.propTypes = {
  ...commonFieldPropTypes,
};

export { TextareaTypeField };



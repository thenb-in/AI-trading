import { BaseInputField } from './shared/BaseInputField';
import { commonFieldPropTypes } from './shared/fieldPropTypes';

function TextTypeField(props) {
  return <BaseInputField {...props} inputType="text" clearAriaLabel="Clear input" />;
}

TextTypeField.propTypes = {
  ...commonFieldPropTypes,
};

export { TextTypeField };



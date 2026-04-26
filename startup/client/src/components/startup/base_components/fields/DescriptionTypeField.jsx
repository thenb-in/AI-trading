import PropTypes from 'prop-types';
import { TextareaTypeField } from './TextareaTypeField';

function DescriptionTypeField(props) {
  return <TextareaTypeField {...props} />;
}

DescriptionTypeField.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
};

export { DescriptionTypeField };



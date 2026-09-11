import { useState } from 'react';
import PropTypes from 'prop-types';
import { TextareaTypeField } from '@startup/components/base_components/fields/TextareaTypeField';

const parseAddresses = (text) =>
  text.split(',').map((entry) => entry.trim()).filter(Boolean);


const AddressesField = ({ values, onChange }) => {
  const [draft, setDraft] = useState(() => values.join(', '));

  const handleChange = (event) => {
    setDraft(event.target.value);
    onChange(parseAddresses(event.target.value));
  };

  return (
    <TextareaTypeField
      name="addresses"
      value={draft}
      rows={2}
      placeholder="auditor@example.com, 919876543210"
      onChange={handleChange}
    />
  );
};

AddressesField.propTypes = {
  values: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired
};

export { AddressesField };

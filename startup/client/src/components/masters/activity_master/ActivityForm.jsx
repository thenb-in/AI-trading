import PropTypes from 'prop-types';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { TextareaTypeField } from '@startup/components/base_components/fields/TextareaTypeField';
import { NumberTypeField } from '@startup/components/base_components/fields/NumberTypeField';

const ActivityForm = ({ formData, onChange }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  return (
    <div className="space-y-4">
      <div>
        <TextTypeField
          name="head"
          label="Head"
          value={formData.head}
          onChange={handleChange}
          placeholder="Enter head identifier (e.g., crane-1)"
          required
        />
      </div>
      <div>
        <TextTypeField
          name="objectName"
          label="Object Name"
          value={formData.objectName}
          onChange={handleChange}
          placeholder="Enter object name (optional)"
        />
      </div>
      <div>
        <TextTypeField
          name="objectId"
          label="Object ID"
          value={formData.objectId}
          onChange={handleChange}
          placeholder="Enter object ID (optional)"
        />
      </div>
      <div>
        <TextareaTypeField
          name="log"
          label="Log Message"
          value={formData.log}
          onChange={handleChange}
          rows={4}
          placeholder="Enter log message"
          required
        />
      </div>
      <div>
        <NumberTypeField
          name="timestamp"
          label="Timestamp (milliseconds)"
          value={formData.timestamp}
          onChange={handleChange}
          placeholder="Unix timestamp in milliseconds"
          numberMode="int"
          allowNegative={false}
        />
        <p className="mt-1 text-xs text-gray-500">Leave empty to use current time</p>
      </div>
    </div>
  );
};

ActivityForm.propTypes = {
  formData: PropTypes.shape({
    head: PropTypes.string,
    log: PropTypes.string,
    timestamp: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    objectName: PropTypes.string,
    objectId: PropTypes.string
  }).isRequired,
  onChange: PropTypes.func.isRequired
};

export { ActivityForm };


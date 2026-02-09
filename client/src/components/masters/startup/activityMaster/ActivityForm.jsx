import PropTypes from 'prop-types';
import { TextField } from '@startup/safe_choice';

const ActivityForm = ({ formData, onChange }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  return (
    <div className="space-y-4">
      <div>
        <TextField
          type="text"
          name="head"
          label="Head"
          value={formData.head}
          onChange={handleChange}
          placeholder="Enter head identifier (e.g., crane-1)"
          required
        />
      </div>
      <div>
        <TextField
          type="text"
          name="objectName"
          label="Object Name"
          value={formData.objectName}
          onChange={handleChange}
          placeholder="Enter object name (optional)"
        />
      </div>
      <div>
        <TextField
          type="text"
          name="objectId"
          label="Object ID"
          value={formData.objectId}
          onChange={handleChange}
          placeholder="Enter object ID (optional)"
        />
      </div>
      <div>
        <TextField
          type="textarea"
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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Timestamp (milliseconds)
        </label>
        <input
          type="number"
          name="timestamp"
          value={formData.timestamp}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Unix timestamp in milliseconds"
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


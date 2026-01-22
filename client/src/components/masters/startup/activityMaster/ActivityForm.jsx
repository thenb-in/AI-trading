import PropTypes from 'prop-types';

const ActivityForm = ({ formData, onChange }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Head *
        </label>
        <input
          type="text"
          name="head"
          value={formData.head}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter head identifier (e.g., crane-1)"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Object Name
        </label>
        <input
          type="text"
          name="objectName"
          value={formData.objectName}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter object name (optional)"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Object ID
        </label>
        <input
          type="text"
          name="objectId"
          value={formData.objectId}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter object ID (optional)"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Log Message *
        </label>
        <textarea
          name="log"
          value={formData.log}
          onChange={handleChange}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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


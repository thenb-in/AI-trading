import { useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { TextareaTypeField } from '@startup/components/base_components/fields/TextareaTypeField';
import { NumberTypeField } from '@startup/components/base_components/fields/NumberTypeField';
import { FormFooter } from '@startup/components/base_components/master/FormFooter';
import { activityService } from '@services/activityService';

const EMPTY_ACTIVITY = {
  head: '',
  log: '',
  timestamp: '',
  objectName: '',
  objectId: ''
};

const ActivityForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState(EMPTY_ACTIVITY);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await activityService.createActivity(
        formData.head,
        formData.log,
        formData.timestamp || Date.now(),
        formData.objectName || null,
        formData.objectId || null
      );
      toast.success(`Activity log for ${formData.head} created`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error?.error || `Failed to create activity log for ${formData.head}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextTypeField
        name="head"
        label="Head"
        value={formData.head}
        onChange={handleChange}
        placeholder="Enter head identifier (e.g., crane-1)"
        required
      />
      <TextTypeField
        name="objectName"
        label="Object Name"
        value={formData.objectName}
        onChange={handleChange}
        placeholder="Enter object name (optional)"
      />
      <TextTypeField
        name="objectId"
        label="Object ID"
        value={formData.objectId}
        onChange={handleChange}
        placeholder="Enter object ID (optional)"
      />
      <TextareaTypeField
        name="log"
        label="Log Message"
        value={formData.log}
        onChange={handleChange}
        rows={4}
        placeholder="Enter log message"
        required
      />
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
      <FormFooter
        onClose={onClose}
        isLoading={isSaving}
        createLabel="Create"
        updateLabel="Create"
      />
    </form>
  );
};

ActivityForm.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired
};

export { ActivityForm };

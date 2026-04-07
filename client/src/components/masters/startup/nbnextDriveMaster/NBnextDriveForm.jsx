import PropTypes from 'prop-types';
import { useState } from 'react';
import { TextTypeField } from '@/components/startup/base_components/fieldss/TextTypeField';
import { FilesSection } from './FilesSection';

const NBnextDriveForm = ({ formData, onChange, onFileChange, multiple = true }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleFileFromSection = (filesOrFile) => {
    const next = Array.isArray(filesOrFile) ? filesOrFile : (filesOrFile ? [filesOrFile] : []);
    setSelectedFiles(next);
    onFileChange(next);
  };

  return (
    <div className="space-y-4">
      <FilesSection
        selectedFiles={selectedFiles}
        onFileChange={handleFileFromSection}
        accept="*/*"
        hint="Any file type supported (max 100MB)"
        showCamera
        multiple={multiple}
      />

      <div>
        <TextTypeField
          name="objectName"
          label="Object Name"
          value={formData.objectName || ''}
          onChange={(e) => onChange('objectName', e.target.value)}
          placeholder="Enter object name (optional)"
        />
      </div>

      <div>
        <TextTypeField
          name="objectId"
          label="Object ID"
          value={formData.objectId || ''}
          onChange={(e) => onChange('objectId', e.target.value)}
          placeholder="Enter object ID (optional)"
        />
      </div>
    </div>
  );
};

NBnextDriveForm.propTypes = {
  formData: PropTypes.shape({
    objectName: PropTypes.string,
    objectId: PropTypes.string
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onFileChange: PropTypes.func.isRequired,
  multiple: PropTypes.bool
};

export { NBnextDriveForm };

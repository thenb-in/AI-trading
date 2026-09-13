import PropTypes from 'prop-types';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { FormFooter } from '@startup/components/base_components/master/FormFooter';
import { nbnextDriveService } from '@/services/nbnextDriveService';
import { FilesSection } from './FilesSection';

const EMPTY_REFERENCE = { objectName: '', objectId: '' };

const NBnextDriveForm = ({ onClose, onSuccess }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [reference, setReference] = useState(EMPTY_REFERENCE);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (filesOrFile) => {
    setSelectedFiles(Array.isArray(filesOrFile) ? filesOrFile : [filesOrFile].filter(Boolean));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setReference((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file to upload');
      return;
    }
    setIsUploading(true);
    try {
      for (const file of selectedFiles) {
        await nbnextDriveService.uploadFile(file, reference.objectName || null, reference.objectId || null);
      }
      toast.success(`${selectedFiles.length} file(s) uploaded to NBnext Drive`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.error || `Failed to upload ${selectedFiles.length} file(s) to NBnext Drive`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FilesSection
        selectedFiles={selectedFiles}
        onFileChange={handleFileChange}
        accept="*/*"
        hint="Any file type supported (max 100MB)"
        showCamera
        multiple
      />
      <TextTypeField
        name="objectName"
        label="Object Name"
        value={reference.objectName}
        onChange={handleChange}
        placeholder="Enter object name (optional)"
      />
      <TextTypeField
        name="objectId"
        label="Object ID"
        value={reference.objectId}
        onChange={handleChange}
        placeholder="Enter object ID (optional)"
      />
      <FormFooter
        onClose={onClose}
        isLoading={isUploading}
        createLabel="Upload"
        updateLabel="Upload"
        creatingLabel="Uploading..."
      />
    </form>
  );
};

NBnextDriveForm.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired
};

export { NBnextDriveForm };

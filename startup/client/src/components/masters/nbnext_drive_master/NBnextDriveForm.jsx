import PropTypes from 'prop-types';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { useFormModal } from '@startup/components/base_components/master/master_modal/FormModal';
import { nbnextDriveService } from '@/services/nbnextDriveService';
import { FilesSection } from './FilesSection';

const EMPTY_REFERENCE = { objectName: '', objectId: '' };

const NBnextDriveForm = ({ onClose, onSuccess }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [reference, setReference] = useState(EMPTY_REFERENCE);

  const handleFileChange = (filesOrFile) => {
    setSelectedFiles(Array.isArray(filesOrFile) ? filesOrFile : [filesOrFile].filter(Boolean));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setReference((prev) => ({ ...prev, [name]: value }));
  };

  // Why the upload can't run yet; the footer shows it beside a disabled button.
  const validate = () => (selectedFiles.length === 0 ? 'Select at least one file to upload to NBnext Drive.' : '');

  useFormModal(async () => {
    try {
      for (const file of selectedFiles) {
        await nbnextDriveService.uploadFile(file, reference.objectName || null, reference.objectId || null);
      }
      toast.success(`${selectedFiles.length} file(s) uploaded to NBnext Drive`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.error || `Failed to upload ${selectedFiles.length} file(s) to NBnext Drive`);
    }
  }, { selectedFiles, reference }, validate);

  return (
    <>
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
    </>
  );
};

NBnextDriveForm.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired
};

export { NBnextDriveForm };

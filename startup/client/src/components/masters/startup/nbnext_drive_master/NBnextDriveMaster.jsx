import { useState } from 'react';
import { MasterHeader } from '@base_components/master/master_header/MasterHeader';
import { MasterSearch } from '@startup/base_components/master/MasterSearch';
import { MasterTable } from '@base_components/master/master_table/MasterTable';
import { MasterModal } from '@base_components/master/master_modal/MasterModal';
import { FileViewerModal } from '@/components/common/FileViewerModal';
import { NBnextDriveForm } from './NBnextDriveForm';
import { nbnextDriveService } from '@/services/startup/nbnextDriveService';
import { useDataContext, hasPermission } from '@/context/startup/useDataContext';
import { Download, Trash2, Eye } from 'lucide-react';
import { MasterModalActions } from '@base_components/master/MasterModalActions';
import { useMasterData } from '@/hooks/useMasterData';
import { toast } from 'react-toastify';

const INITIAL_FORM = {
  objectName: '',
  objectId: ''
};

const SEARCH_KEYS = ['fileName', 'objectName', 'createdByName'];

const fetchFiles = () => nbnextDriveService.getAllFiles();

const NBnextDriveMaster = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [viewerState, setViewerState] = useState({ open: false, url: '', mime: '', title: '' });
  const dataContext = useDataContext();

  const canCreate = hasPermission('create_nbnext_drive', dataContext);
  const canReadAll = hasPermission('read_nbnext_drive', dataContext);
  const canReadPersonal = hasPermission('read_personal_nbnext_drive', dataContext);
  const canDelete = hasPermission('delete_nbnext_drive', dataContext);
  const canDownload = hasPermission('download_nbnext_drive', dataContext);
  const canRead = canReadAll || canReadPersonal;

  const showAll = canReadAll;

  const {
    tableColumns,
    filteredData,
    loading,
    searchQuery,
    setSearchQuery,
    isModalOpen,
    formData,
    handleFormChange,
    openModal: baseOpenModal,
    closeModal: baseCloseModal,
    fetchData,
  } = useMasterData({
    fetchService: fetchFiles,
    initialFormData: INITIAL_FORM,
    searchKeys: SEARCH_KEYS,
    errorMessage: 'Failed to fetch files',
  });

  const openModal = () => {
    setSelectedFiles([]);
    baseOpenModal();
  };

  const closeModal = () => {
    setSelectedFiles([]);
    baseCloseModal();
  };

  const handleFileChange = (files) => {
    setSelectedFiles(Array.isArray(files) ? files : []);
  };

  const handleSave = async () => {
    const toUpload = Array.isArray(selectedFiles) ? selectedFiles : [];
    if (toUpload.length === 0) {
      toast.error('Please select at least one file to upload');
      return;
    }

    try {
      for (const file of toUpload) {
        await nbnextDriveService.uploadFile(
          file,
          formData.objectName || null,
          formData.objectId || null
        );
      }
      toast.success(toUpload.length === 1 ? 'File uploaded successfully' : `${toUpload.length} files uploaded successfully`);
      closeModal();
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to upload file');
    }
  };

  const handleView = async (_id, file) => {
    try {
      const fileUrl = `/uploads/${file.filePath}`;
      setViewerState({
        open: true,
        url: fileUrl,
        mime: file.mimeType || '',
        title: file.fileName || 'File Preview'
      });
    } catch (error) {
      console.error('Error opening file viewer:', error);
      toast.error('Failed to open file');
    }
  };

  const handleDownload = async (id, file) => {
    try {
      const response = await nbnextDriveService.downloadFile(id);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('File downloaded successfully');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to download file');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      await nbnextDriveService.deleteFile(id);
      toast.success('File deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to delete file');
    }
  };

  if (!canRead) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">You don&apos;t have permission to view files</div>
      </div>
    );
  }

  const actions = [];
  if (canDownload) {
    actions.push({
      label: 'Download',
      icon: <Download className="w-4 h-4" />,
      onClick: handleDownload,
      type: 'primary'
    });
  }
  actions.push({
    label: 'View',
    icon: <Eye className="w-4 h-4" />,
    onClick: handleView,
    type: 'default'
  });
  if (canDelete) {
    actions.push({
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: handleDelete,
      type: 'danger'
    });
  }

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-8xl mx-auto">
      <MasterHeader
        title="NBnext Drive"
        description={`${showAll ? 'View and manage all files' : 'View and manage your personal files'} in NBnext Drive. Upload, view, download, and delete files.`}
        onAdd={canCreate ? openModal : null}
        onRefresh={fetchData}
        userData={dataContext.userData}
        permissionKey="create_nbnext_drive"
        addButtonText="Upload File"
        showBack={true}
        backUrl="/admin/master"
      />

      <div className="mb-4 justify-center flex">
        <MasterSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search files by name or created by..."
        />
      </div>

      <MasterTable
        columns={tableColumns}
        data={filteredData}
        loading={loading}
        actions={actions}
        emptyMessage="No files found"
        loadingMessage="Loading files..."
      />

      {canCreate && (
        <MasterModal
          isOpen={isModalOpen}
          onClose={closeModal}
          title="Upload File"
          maxWidth="md"
          actions={<MasterModalActions onCancel={closeModal} onConfirm={handleSave} confirmLabel="Upload" />}
        >
          <NBnextDriveForm
            formData={formData}
            onChange={handleFormChange}
            onFileChange={handleFileChange}
          />
        </MasterModal>
      )}

      <FileViewerModal
        isOpen={viewerState.open}
        onClose={() => setViewerState({ open: false, url: '', mime: '', title: '' })}
        fileUrl={viewerState.url}
        mimeType={viewerState.mime}
        title={viewerState.title}
      />
    </div>
  );
};

export { NBnextDriveMaster };

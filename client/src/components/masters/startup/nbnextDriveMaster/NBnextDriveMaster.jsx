import { useState, useEffect, useMemo } from 'react';
import { MasterHeader } from '@startup/BaseMasterComponents/MasterHeader/MasterHeader';
import { MasterSearchInput } from '@startup/BaseMasterComponents/MasterSearchInput';
import { MasterTable } from '@startup/BaseMasterComponents/MasterTable/MasterTable';
import { MasterModal } from '@startup/BaseMasterComponents/MasterModal/MasterModal';
import { FileViewerModal } from '@/components/common/FileViewerModal';
import { NBnextDriveForm } from './NBnextDriveForm';
import { nbnextDriveService } from '@/services/startup/nbnextDriveService';
import { useDataContext, hasPermission } from '@/context/startup/useDataContext';
import { X, Plus, Download, Trash2, Eye } from 'lucide-react';
import { toast } from 'react-toastify';

const NBnextDriveMaster = () => {
  const [columns, setColumns] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewerState, setViewerState] = useState({ open: false, url: '', mime: '', title: '' });
  const [formData, setFormData] = useState({
    objectName: '',
    objectId: ''
  });
  const dataContext = useDataContext();

  const canCreate = hasPermission('create_nbnext_drive', dataContext);
  const canReadAll = hasPermission('read_nbnext_drive', dataContext);
  const canReadPersonal = hasPermission('read_personal_nbnext_drive', dataContext);
  const canDelete = hasPermission('delete_nbnext_drive', dataContext);
  const canDownload = hasPermission('download_nbnext_drive', dataContext);
  const canRead = canReadAll || canReadPersonal;

  const showAll = canReadAll;

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await nbnextDriveService.getAllFiles();

      if (response.columns && response.data) {
        setColumns(response.columns);
        setFiles(response.data);
      } else {
        setFiles(response.data || response || []);
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (file) => {
    setSelectedFile(file);
  };

  const handleAdd = () => {
    setFormData({
      objectName: '',
      objectId: ''
    });
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      await nbnextDriveService.uploadFile(
        selectedFile,
        formData.objectName || null,
        formData.objectId || null
      );
      toast.success('File uploaded successfully');
      setIsModalOpen(false);
      setSelectedFile(null);
      fetchFiles();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to upload file');
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
  };

  const handleView = async (id, file) => {
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
      fetchFiles();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to delete file');
    }
  };

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) {
      return files;
    }

    const query = searchQuery.toLowerCase();
    return files.filter(file => {
      return (
        (file.fileName && file.fileName.toLowerCase().includes(query)) ||
        (file.objectName && file.objectName.toLowerCase().includes(query)) ||
        (file.createdByName && file.createdByName.toLowerCase().includes(query))
      );
    });
  }, [files, searchQuery]);

  if (!canRead) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">You don&apos;t have permission to view files</div>
      </div>
    );
  }

  const tableColumns = columns.length > 0
    ? columns.map(col => ({
        key: col.key,
        label: col.display_name || col.label || col.key,
        type: col.type || 'string'
      }))
    : [];

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
        onAdd={canCreate ? handleAdd : null}
        onRefresh={fetchFiles}
        userData={dataContext.userData}
        permissionKey="create_nbnext_drive"
        addButtonText="Upload File"
        showBack={true}
        backUrl="/admin/master"
      />

      <div className="mb-4 justify-center flex">
        <MasterSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search files by name or created by..."
        />
      </div>

      <MasterTable
        columns={tableColumns}
        data={filteredFiles}
        loading={loading}
        actions={actions}
        emptyMessage="No files found"
        loadingMessage="Loading files..."
      />

      {canCreate && (
        <MasterModal
          isOpen={isModalOpen}
          onClose={handleClose}
          title="Upload File"
          maxWidth="md"
          actions={
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <X className="w-4 h-4 inline mr-2" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Upload
              </button>
            </>
          }
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


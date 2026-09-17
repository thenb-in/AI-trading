import { useCallback } from 'react';
import { Download } from 'lucide-react';
import { BaseMaster } from '@startup/components/base_components/master';
import { MASTERS } from '@startup/constants/masters';
import { hasPermission } from '@startup/hooks/hasPermission';
import { nbnextDriveService } from '@/services/nbnextDriveService';
import { NBnextDriveForm } from './NBnextDriveForm';
import { NBnextDriveDetails } from './NBnextDriveDetails';
import { downloadDriveFile } from './downloadDriveFile';

// Either read permission opens the page; the server decides whether that means
// every file or only your own.
const PERMISSION_KEYS = {
  read: ['read_nbnext_drive', 'read_personal_nbnext_drive'],
  create: 'create_nbnext_drive',
  delete: 'delete_nbnext_drive'
};

const loadFiles = () => nbnextDriveService.getAllFiles();

const confirmDeleteFile = (file) => `Delete ${file.fileName}? It cannot be recovered.`;

// nbnextDriveService unwraps the HTTP response to its body, and BaseMaster reads
// the body under `data`, as it comes on a raw response.
const deleteFile = async (id) => ({ data: await nbnextDriveService.deleteFile(id) });

// nbnextDriveService already unwraps the HTTP response to { columns, data }.
const extractResponse = (response) => ({ rows: response.data, columns: response.columns });

const NBnextDriveMaster = () => {
  const scope = hasPermission('read_nbnext_drive') ? 'all files' : 'your personal files';
  const canDownload = hasPermission('download_nbnext_drive');

  const extraActions = useCallback(
    () => [
      ...(canDownload
        ? [{
            label: 'Download',
            icon: <Download className="w-4 h-4" />,
            type: 'primary',
            onClick: (_id, row) => downloadDriveFile(row)
          }]
        : [])
    ],
    [canDownload]
  );

  return (
    <BaseMaster
      masterName={MASTERS.NBNEXT_DRIVE}
      title="NBnext Drive"
      description={`View and manage ${scope} in NBnext Drive. Upload, view, download, and delete files.`}
      addButtonText="Upload File"
      searchPlaceholder="Search files by name, source or created by..."
      modalAddTitle="Upload File"
      modalEditTitle="File"
      createLabel="Upload"
      savingLabel="Uploading..."
      modalMaxWidth="lg"
      baseMasterContainerWidth="max-w-8xl"
      permissionKeys={PERMISSION_KEYS}
      loadRows={loadFiles}
      extractResponse={extractResponse}
      deleteRow={deleteFile}
      deleteConfirmText={confirmDeleteFile}
      FormComponent={NBnextDriveForm}
      DetailComponent={NBnextDriveDetails}
      extraActions={extraActions}
      unauthorizedToast="You are not authorized to view files"
      fetchFailureToast="Failed to fetch files"
      exportReport={{ title: 'NBnext Drive', slug: 'nbnext-drive' }}
    />
  );
};

export { NBnextDriveMaster };

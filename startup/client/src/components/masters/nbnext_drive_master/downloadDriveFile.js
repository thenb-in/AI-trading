import { toast } from 'react-toastify';
import { nbnextDriveService } from '@/services/nbnextDriveService';

/** Save a Drive file to the user's machine under its own name. */
const downloadDriveFile = async (file) => {
  try {
    const response = await nbnextDriveService.downloadFile(file.id);
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = file.fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success(`Downloaded ${file.fileName}`);
  } catch (error) {
    toast.error(error?.response?.data?.error || `Failed to download ${file.fileName}`);
  }
};

export { downloadDriveFile };

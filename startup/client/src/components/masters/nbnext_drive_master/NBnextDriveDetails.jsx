import PropTypes from 'prop-types';
import { Download } from 'lucide-react';
import { useDataContext } from '@context/useDataContext';
import { hasPermission } from '@utils/hasPermission';
import { FileViewer } from '@/components/common/FileViewer';
import { MasterRecordDetails } from '@startup/components/base_components/master/MasterRecordDetails';
import { downloadDriveFile } from './downloadDriveFile';

/** A Drive file opened from the grid: what it is, and the file itself. */
const NBnextDriveDetails = ({ initialData, columns }) => {
  const { userData } = useDataContext();
  const canDownload = hasPermission(userData, 'download_nbnext_drive');
  const handleDownload = () => downloadDriveFile(initialData);

  return (
    <div className="space-y-4">
      <MasterRecordDetails initialData={initialData} columns={columns} />
      <div className="h-[60vh] border border-gray-200 rounded-lg overflow-hidden">
        {/* The authenticated download API — `/uploads/...` is not reliably served to the viewer. */}
        <FileViewer
          fileUrl={`/nbnext-drive/${initialData.id}/download`}
          mimeType={initialData.mimeType || ''}
          title={initialData.fileName}
          onDownload={canDownload ? handleDownload : undefined}
          headerActions={canDownload && (
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center px-2 py-1 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-white hover:bg-blue-50"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </button>
          )}
        />
      </div>
    </div>
  );
};

NBnextDriveDetails.propTypes = {
  initialData: PropTypes.shape({
    id: PropTypes.number.isRequired,
    fileName: PropTypes.string,
    mimeType: PropTypes.string
  }).isRequired,
  columns: PropTypes.array.isRequired
};

export { NBnextDriveDetails };

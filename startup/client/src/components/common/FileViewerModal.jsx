import PropTypes from 'prop-types';
import { X } from 'lucide-react';
// Straight to the module, not the master barrel: the barrel re-exports BaseMaster,
// and BaseMaster reaches back here through the audit modal and the comments panel.
import { BaseModal } from '@startup/components/base_components/master/master_modal/BaseModal';
import { FileViewer } from './FileViewer';

/**
 * File Viewer Modal Component
 * Displays a file in a popup, with the viewer its type needs.
 *
 * The viewer draws its own toolbar — the file's name, zoom, download — so the
 * modal carries no title of its own and Close sits in that toolbar, beside the
 * other things you can do to the file.
 */
const FileViewerModal = ({ isOpen, onClose, ...viewerProps }) => (
  <BaseModal
    isOpen={isOpen}
    onClose={onClose}
    maxWidth="lg"
    showAudit={false}
    disableContentScroll
  >
    <div className="flex h-[80vh] flex-col overflow-hidden">
      <FileViewer
        {...viewerProps}
        headerActions={(
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        )}
      />
    </div>
  </BaseModal>
);

FileViewerModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  fileUrl: PropTypes.string,
  mimeType: PropTypes.string,
  title: PropTypes.string,
  onLoadError: PropTypes.func,
  onDownload: PropTypes.func,
};

export { FileViewerModal };

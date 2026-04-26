import PropTypes from 'prop-types';

/**
 * PDF Viewer Component
 * Displays PDF files in an iframe
 */
const PdfViewer = ({ blobUrl, fileUrl }) => {
  return (
    <iframe 
      title="PDF Viewer" 
      src={blobUrl || fileUrl} 
      className="w-full h-full border-0" 
    />
  );
};

PdfViewer.propTypes = {
  blobUrl: PropTypes.string,
  fileUrl: PropTypes.string,
};

export { PdfViewer };

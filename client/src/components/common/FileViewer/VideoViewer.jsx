import PropTypes from 'prop-types';

/**
 * Video Viewer Component
 * Displays video files with controls
 */
const VideoViewer = ({ blobUrl, fileUrl }) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <video 
        src={blobUrl || fileUrl} 
        controls 
        className="max-w-full max-h-full"
        autoPlay={false}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

VideoViewer.propTypes = {
  blobUrl: PropTypes.string,
  fileUrl: PropTypes.string,
};

export { VideoViewer };

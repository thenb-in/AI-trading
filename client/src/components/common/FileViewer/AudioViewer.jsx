import PropTypes from 'prop-types';

/**
 * Audio Viewer Component
 * Displays audio files with controls
 */
const AudioViewer = ({ blobUrl, fileUrl, title }) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-center p-8">
        <div className="mb-4 text-gray-600">{title}</div>
        <audio 
          src={blobUrl || fileUrl} 
          controls 
          className="w-full max-w-md"
          autoPlay={false}
        >
          Your browser does not support the audio tag.
        </audio>
      </div>
    </div>
  );
};

AudioViewer.propTypes = {
  blobUrl: PropTypes.string,
  fileUrl: PropTypes.string,
  title: PropTypes.string,
};

export { AudioViewer };

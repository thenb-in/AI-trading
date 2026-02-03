import PropTypes from 'prop-types';

/**
 * Captured media preview component
 */
const CapturedMediaPreview = ({ capturedMedia, mode }) => {
  if (!capturedMedia) return null;

  return (
    <div className="relative w-full aspect-video">
      {mode === 'photo' ? (
        <img
          src={capturedMedia}
          alt="Captured"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <video
          src={capturedMedia}
          controls
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </div>
  );
};

CapturedMediaPreview.propTypes = {
  capturedMedia: PropTypes.string,
  mode: PropTypes.oneOf(['photo', 'video']).isRequired
};

export { CapturedMediaPreview };


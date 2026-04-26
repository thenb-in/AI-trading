import PropTypes from 'prop-types';

/**
 * Image Viewer Component
 * Displays images with zoom and pan functionality
 */
const ImageViewer = ({
  blobUrl,
  fileUrl,
  title,
  imageZoom,
  imagePosition,
  isDragging,
  imageRef,
  containerRef,
  handleWheel,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
}) => {

  const cursorClass = imageZoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default';
  const transitionClass = isDragging ? '' : 'transition-transform duration-100 ease-out';

  return (
    <div 
      ref={containerRef}
      className="w-full h-full overflow-hidden relative bg-black flex items-center justify-center"
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <style>{`
        .image-viewer-transform {
          transform: translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageZoom});
        }
      `}</style>
      <img
        ref={imageRef}
        src={blobUrl || fileUrl}
        alt={title}
        className={`max-w-none select-none image-viewer-transform ${cursorClass} ${transitionClass}`}
        onMouseDown={handleMouseDown}
        draggable={false}
      />
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded text-sm">
        Zoom: {Math.round(imageZoom * 100)}%
      </div>
    </div>
  );
};

ImageViewer.propTypes = {
  blobUrl: PropTypes.string,
  fileUrl: PropTypes.string,
  title: PropTypes.string,
  imageZoom: PropTypes.number.isRequired,
  imagePosition: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }).isRequired,
  isDragging: PropTypes.bool.isRequired,
  imageRef: PropTypes.object.isRequired,
  containerRef: PropTypes.object.isRequired,
  handleWheel: PropTypes.func.isRequired,
  handleMouseDown: PropTypes.func.isRequired,
  handleMouseMove: PropTypes.func.isRequired,
  handleMouseUp: PropTypes.func.isRequired,
};

export { ImageViewer };

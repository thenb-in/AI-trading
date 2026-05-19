import PropTypes from 'prop-types';
import { useCallback } from 'react';
import { MasterModal } from '@startup/components/base_components/master/master_modal/MasterModal';
import { CameraCaptureContent } from './components/CameraCaptureContent';

/**
 * Camera capture inside a modal. For inline usage (e.g. QuickCheckIn), use CameraCaptureContent with variant="inline".
 */
// `Content` lets app-side wrappers swap in an extended CameraCaptureContent
// (e.g. with Pico face detection) without duplicating the modal scaffolding.
const CameraCapture = ({
  onCapture,
  onClose,
  isOpen,
  mode = 'photo',
  cameraContainerClassName,
  Content = CameraCaptureContent,
  contentProps,
}) => {
  const handleClose = useCallback(() => {
    if (onClose) onClose();
  }, [onClose]);

  return (
    <MasterModal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'photo' ? 'Take Photo' : 'Record Video'}
      size="lg"
    >
      <Content
        onCapture={onCapture}
        onClose={handleClose}
        mode={mode}
        isActive={isOpen}
        variant="modal"
        cameraContainerClassName={cameraContainerClassName}
        {...contentProps}
      />
    </MasterModal>
  );
};

CameraCapture.propTypes = {
  onCapture: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  mode: PropTypes.oneOf(['photo', 'video']),
  cameraContainerClassName: PropTypes.string,
  Content: PropTypes.elementType,
  contentProps: PropTypes.object,
};

export { CameraCapture };
export { CameraCaptureContent } from './components/CameraCaptureContent';
export default CameraCapture;

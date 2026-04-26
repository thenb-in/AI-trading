import PropTypes from 'prop-types';
import { useCallback } from 'react';
import { MasterModal } from '@startup/components/base_components/master/master_modal/MasterModal';
import { CameraCaptureContent } from './components/CameraCaptureContent';

/**
 * Camera capture inside a modal. For inline usage (e.g. QuickCheckIn), use CameraCaptureContent with variant="inline".
 */
const CameraCapture = ({
  onCapture,
  onClose,
  isOpen,
  mode = 'photo',
  enableFaceDetection = false,
  cameraContainerClassName,
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
      <CameraCaptureContent
        onCapture={onCapture}
        onClose={handleClose}
        mode={mode}
        enableFaceDetection={enableFaceDetection}
        isActive={isOpen}
        variant="modal"
        cameraContainerClassName={cameraContainerClassName}
      />
    </MasterModal>
  );
};

CameraCapture.propTypes = {
  onCapture: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  mode: PropTypes.oneOf(['photo', 'video']),
  enableFaceDetection: PropTypes.bool,
  cameraContainerClassName: PropTypes.string,
};

export { CameraCapture };
export { CameraCaptureContent } from './components/CameraCaptureContent';
export default CameraCapture;

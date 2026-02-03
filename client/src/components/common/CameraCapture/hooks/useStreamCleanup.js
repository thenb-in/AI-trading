import { useRef, useCallback } from 'react';

/**
 * Custom hook for managing stream cleanup
 */
const useStreamCleanup = (streamRef, videoRef, mediaRecorderRef, recordingTimerRef) => {
  const isCleaningUpRef = useRef(false);

  const stopAllStreams = useCallback(() => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    // Stop media recorder
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (err) {
        console.warn('Error stopping media recorder:', err);
      }
      mediaRecorderRef.current = null;
    }

    // Stop recording timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    // Collect all tracks to stop
    const tracksToStop = new Set();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => tracksToStop.add(track));
      streamRef.current = null;
    }

    // Stop all collected tracks
    tracksToStop.forEach(track => {
      try {
        if (track.readyState !== 'ended') {
          track.stop();
        }
      } catch (err) {
        console.warn('Error stopping track:', err);
      }
    });

    // Clear video element
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        videoRef.current.load();
      } catch (err) {
        console.warn('Error clearing video element:', err);
      }
    }

    isCleaningUpRef.current = false;
  }, [streamRef, videoRef, mediaRecorderRef, recordingTimerRef]);

  return {
    stopAllStreams,
    isCleaningUpRef
  };
};

export { useStreamCleanup };


import { useState, useRef, useCallback } from 'react';
import { getSupportedMimeType, getExtensionFromMimeType } from '../utils/mediaUtils';
import { ERROR_MESSAGES } from '../constants/cameraConstants';

/**
 * Custom hook for video recording functionality
 */
const useVideoRecording = (stream, isVideoReady, onCapture) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const startRecording = useCallback(() => {
    if (!stream || !isVideoReady) {
      return { error: ERROR_MESSAGES.RECORDING_NOT_READY };
    }

    if (!window.MediaRecorder) {
      return { error: ERROR_MESSAGES.RECORDING_NOT_SUPPORTED };
    }

    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) {
      return { error: ERROR_MESSAGES.NO_VIDEO_TRACK };
    }

    try {
      recordedChunksRef.current = [];
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};

      const mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setIsRecording(false);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        return { error: ERROR_MESSAGES.RECORDING_ERROR };
      };

      mediaRecorder.onstop = () => {
        if (recordedChunksRef.current.length === 0) {
          setIsRecording(false);
          if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
          }
          return;
        }

        const blob = new Blob(recordedChunksRef.current, {
          type: mediaRecorder.mimeType || 'video/webm'
        });

        const extension = getExtensionFromMimeType(mediaRecorder.mimeType);
        const file = new File([blob], `video-${Date.now()}.${extension}`, { type: blob.type });

        if (onCapture) {
          onCapture(file);
        }
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      return { success: true };
    } catch (err) {
      console.error('Recording start error:', err);
      return { error: 'Failed to start recording. Please try again.' };
    }
  }, [stream, isVideoReady, onCapture]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecording(false);
  }, []);

  const cleanupRecording = useCallback(() => {
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

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecording(false);
    setRecordingTime(0);
    recordedChunksRef.current = [];
  }, []);

  return {
    isRecording,
    recordingTime,
    mediaRecorderRef,
    startRecording,
    stopRecording,
    cleanupRecording
  };
};

export { useVideoRecording };


/**
 * Image Zoom and Pan Hook
 * Manages zoom level, position, and drag interactions for images
 */

import { useState, useRef, useEffect } from 'react';

/**
 * Custom hook for image zoom and pan functionality
 * @param {boolean} isOpen - Whether the viewer is open
 * @returns {object} Zoom and pan state and handlers
 */
const useImageZoom = (isOpen) => {
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  // Reset zoom and position when viewer opens/closes
  useEffect(() => {
    if (isOpen) {
      setImageZoom(1);
      setImagePosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Zoom controls
  const handleZoomIn = () => {
    setImageZoom(prev => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setImageZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const handleFitToScreen = () => {
    if (imageRef.current && containerRef.current) {
      const img = imageRef.current;
      const container = containerRef.current;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const containerAspect = container.clientWidth / container.clientHeight;
      
      if (imgAspect > containerAspect) {
        setImageZoom(container.clientWidth / img.naturalWidth);
      } else {
        setImageZoom(container.clientHeight / img.naturalHeight);
      }
      setImagePosition({ x: 0, y: 0 });
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setImageZoom(prev => Math.max(0.5, Math.min(5, prev + delta)));
  };

  // Drag handling
  const handleMouseDown = (e) => {
    if (imageZoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && imageZoom > 1) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return {
    imageZoom,
    imagePosition,
    isDragging,
    imageRef,
    containerRef,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleFitToScreen,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
};

export { useImageZoom };


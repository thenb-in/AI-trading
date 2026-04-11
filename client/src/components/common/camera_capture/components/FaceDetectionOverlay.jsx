import PropTypes from 'prop-types';
import { useRef, useEffect, useState, useMemo, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const BOX_WIDTH_PX = 130;
const BOX_HEIGHT_PX = 170;

const BOX_INNER_INSET = 4;
const BOX_STROKE_COLOR = '#22c55e';
const BOX_INNER_STROKE_COLOR = 'rgba(34, 197, 94, 0.5)';
const BOX_STROKE_WIDTH = 3;
const BOX_INNER_STROKE_WIDTH = 1.5;

// ─── Prop Shapes ─────────────────────────────────────────────────────────────

const FACE_RECT_SHAPE = PropTypes.shape({
  left: PropTypes.number,
  top: PropTypes.number,
  width: PropTypes.number,
  height: PropTypes.number,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns only valid normalized (0–1) face rect objects from the input array.
 * @param {Array} faceRects - Raw face rect input.
 * @returns {Array} Filtered array of valid face rect objects.
 */
const getValidFaceRects = (faceRects) =>
  Array.isArray(faceRects)
    ? faceRects.filter(
        (r) =>
          r &&
          typeof r.left === 'number' &&
          typeof r.top === 'number' &&
          typeof r.width === 'number' &&
          typeof r.height === 'number'
      )
    : [];

/**
 * Computes the normalized center X and Y ratios for a face rect.
 * @param {{ left: number, top: number, width: number, height: number }} rect
 * @returns {{ centerXRatio: number, centerYRatio: number }}
 */
const getFaceCenter = (rect) => ({
  centerXRatio: (rect.left ?? 0) + (rect.width ?? 0) / 2,
  centerYRatio: (rect.top ?? 0) + (rect.height ?? 0) / 2,
});

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Renders a green box overlay for each detected face using both a canvas layer
 * (for precise pixel drawing) and absolute-positioned div boxes (for DOM
 * accessibility and event handling).
 *
 * Must be rendered inside the same positioned container as `containerRef`.
 *
 * @param {object}  props
 * @param {boolean} props.enableFaceDetection - Whether to render the overlay.
 * @param {Array}   props.faceRects           - Array of normalized face rects.
 * @param {object}  props.containerRef        - Ref to the parent container element.
 */
const FaceDetectionOverlay = ({
  enableFaceDetection = false,
  faceRects = [],
  containerRef,
}) => {
  const overlayCanvasRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const validRects = useMemo(() => getValidFaceRects(faceRects), [faceRects]);

  // ── Canvas drawing ──────────────────────────────────────────────────────────

  const drawFaceBoxes = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    const container = containerRef?.current;
    if (!canvas || !container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w <= 0 || h <= 0) return;

    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    validRects.forEach((rect) => {
      const { centerXRatio, centerYRatio } = getFaceCenter(rect);
      const cx = centerXRatio * w;
      const cy = centerYRatio * h;
      const x = cx - BOX_WIDTH_PX / 2;
      const y = cy - BOX_HEIGHT_PX / 2;

      ctx.strokeStyle = BOX_STROKE_COLOR;
      ctx.lineWidth = BOX_STROKE_WIDTH;
      ctx.strokeRect(x, y, BOX_WIDTH_PX, BOX_HEIGHT_PX);

      ctx.strokeStyle = BOX_INNER_STROKE_COLOR;
      ctx.lineWidth = BOX_INNER_STROKE_WIDTH;
      ctx.strokeRect(
        x + BOX_INNER_INSET,
        y + BOX_INNER_INSET,
        BOX_WIDTH_PX - BOX_INNER_INSET * 2,
        BOX_HEIGHT_PX - BOX_INNER_INSET * 2,
      );
    });
  }, [validRects, containerRef]);

  // Redraw whenever rects or container size change
  useEffect(() => {
    if (!enableFaceDetection) return;
    drawFaceBoxes();
  }, [enableFaceDetection, drawFaceBoxes, containerSize]);

  // ── Resize observer ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!enableFaceDetection || !containerRef?.current) return;

    const container = containerRef.current;

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) setContainerSize({ w, h });
    };

    handleResize();

    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    return () => observer.disconnect();
  }, [enableFaceDetection, containerRef]);

  // ── Early exit ──────────────────────────────────────────────────────────────

  if (!enableFaceDetection) return null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {validRects.map((rect, index) => {
        const { centerXRatio, centerYRatio } = getFaceCenter(rect);

        return (
          <div
            key={`face-${index}`}
            className="pointer-events-none absolute z-50 border-2 border-green-500 rounded-lg bg-green-500/10"
            /* eslint-disable-next-line custom/no-inline-styles -- dynamic position/size from face detection */
            style={{
              left: `${centerXRatio * 100}%`,
              top: `${centerYRatio * 100}%`,
              width: `${BOX_WIDTH_PX}px`,
              height: `${BOX_HEIGHT_PX}px`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        );
      })}
      <canvas
        ref={overlayCanvasRef}
        className="pointer-events-none absolute inset-0 left-0 top-0 z-40 w-full h-full"
      />
    </>
  );
};

FaceDetectionOverlay.displayName = 'FaceDetectionOverlay';

FaceDetectionOverlay.propTypes = {
  enableFaceDetection: PropTypes.bool,
  faceRects: PropTypes.arrayOf(FACE_RECT_SHAPE),
  containerRef: PropTypes.object.isRequired,
};

export { FaceDetectionOverlay };
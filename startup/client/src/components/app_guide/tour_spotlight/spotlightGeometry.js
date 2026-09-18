import { clamp } from '@utils/toValidNumber';

const RING_PADDING = 6;
const CARD_WIDTH = 360;
const CARD_GAP = 14;
const VIEWPORT_EDGE = 12; 
const TALL_ELEMENT = 260; 
const CARD_ROOM = 280;
const CARET_SIZE = 6;
const CARET_INSET = 16;


const ringBox = (rect) => ({
  top: rect.top - RING_PADDING,
  left: rect.left - RING_PADDING,
  width: rect.width + RING_PADDING * 2,
  height: rect.height + RING_PADDING * 2,
});


const blockerBoxes = (ring) => [
  { id: 'above', style: { top: 0, left: 0, right: 0, height: Math.max(0, ring.top) } },
  { id: 'below', style: { top: ring.top + ring.height, left: 0, right: 0, bottom: 0 } },
  { id: 'left', style: { top: ring.top, left: 0, width: Math.max(0, ring.left), height: ring.height } },
  { id: 'right', style: { top: ring.top, left: ring.left + ring.width, right: 0, height: ring.height } },
];


const placeCard = (rect) => {
  const width = Math.min(CARD_WIDTH, window.innerWidth - VIEWPORT_EDGE * 2);

  if (rect.height > TALL_ELEMENT && window.innerWidth - rect.right > width + CARD_GAP + VIEWPORT_EDGE) {
    const top = clamp(rect.top, VIEWPORT_EDGE, window.innerHeight - CARD_ROOM);
    return {
      side: 'right',
      box: { left: rect.right + CARD_GAP, top, width },
      caret: { top: clamp(rect.top + 20 - top, CARET_INSET, 200) },
    };
  }

  const centre = rect.left + rect.width / 2;
  const left = clamp(centre - width / 2, VIEWPORT_EDGE, window.innerWidth - width - VIEWPORT_EDGE);
  const caret = { left: clamp(centre - left - CARET_SIZE, CARET_INSET, width - CARET_INSET - 12) };

  return window.innerHeight - rect.bottom > CARD_ROOM
    ? { side: 'bottom', box: { left, width, top: rect.bottom + CARD_GAP }, caret }
    : { side: 'top', box: { left, width, bottom: window.innerHeight - rect.top + CARD_GAP }, caret };
};

export { blockerBoxes, placeCard, ringBox };

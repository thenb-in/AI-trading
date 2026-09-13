import { useCallback, useLayoutEffect, useState } from 'react';

const GAP = 4;
// Never wider than the viewport it has to sit in. Kept as a ratio because the
// menu is also given it as a `vw` maxWidth — the two must agree, or the clamped
// `left` would be computed from a width the menu never gets.
const MAX_VIEWPORT_RATIO = 0.95;
const DEFAULT_MAX_HEIGHT = 320;
// Below this a flipped menu is more cramped than useful; it scrolls instead.
const MIN_HEIGHT = 140;

/**
 * Positions a menu portalled onto <body> against the element it belongs to:
 * below it, or above when below can't fit and above has more room; at least
 * `minWidth` wide, never wider than the viewport. Re-anchors on scroll and
 * resize while open. Returns the menu's `sx`, or null until first measured.
 */
const useAnchoredPosition = ({ anchorRef, menuRef, isOpen, minWidth = 0, maxHeight = DEFAULT_MAX_HEIGHT }) => {
  const [anchor, setAnchor] = useState(null);
  const [menuHeight, setMenuHeight] = useState(0);

  // `maxHeight` is clamped to whichever side was picked, so the menu scrolls
  // internally instead of running off-screen.
  const measure = useCallback(() => {
    const rect = anchorRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;
    const flip = spaceBelow < maxHeight && spaceAbove > spaceBelow;
    setAnchor({
      top: rect.top + window.scrollY,
      bottom: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      flip,
      maxHeight: Math.max(MIN_HEIGHT, Math.min(maxHeight, flip ? spaceAbove : spaceBelow)),
    });
  }, [anchorRef, maxHeight]);

  // Measured before paint, so an opening menu never shows where it last was.
  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [isOpen, measure]);

  // A flipped menu hangs off its own height, so it has to be measured too —
  // until then the clamped maxHeight is the best available stand-in.
  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const height = menuRef.current.offsetHeight;
    setMenuHeight((prev) => (prev === height ? prev : height));
  });

  if (!anchor) return null;

  // The floor is applied first and the viewport cap last, so on a screen
  // narrower than the floor the cap wins — and `left` is clamped against the
  // width the menu will actually have. Both are document coordinates (the menu
  // lives on body), hence the scroll terms.
  const width = Math.min(Math.max(anchor.width, minWidth), window.innerWidth * MAX_VIEWPORT_RATIO);
  const left = Math.max(
    window.scrollX + GAP,
    Math.min(anchor.left, window.scrollX + window.innerWidth - width - GAP)
  );

  return {
    position: 'absolute',
    top: anchor.flip
      ? anchor.top - (menuHeight || anchor.maxHeight) - GAP
      : anchor.bottom + GAP,
    left,
    width,
    maxWidth: `${MAX_VIEWPORT_RATIO * 100}vw`,
    maxHeight: anchor.maxHeight,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 9999,
  };
};

export { useAnchoredPosition };

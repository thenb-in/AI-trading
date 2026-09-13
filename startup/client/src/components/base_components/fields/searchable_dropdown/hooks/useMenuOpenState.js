import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Whether the menu is open, and what is typed into the field while it is.
 *
 * Closing always drops the search term: the field itself is the search box,
 * so a leftover term would sit in the closed control looking like a value.
 * There are three ways out:
 *   closeMenu({ keepTyped })  leaving the field (click outside, Tab, chevron);
 *                             runs `commitOnLeaveRef` first unless keepTyped is
 *                             false (Escape), and tells the caller via onClose
 *   closeAfterPick()          a row already set the value; nothing to commit
 */
const useMenuOpenState = ({ autoOpen, onOpen, onClose }) => {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [searchTerm, setSearchTerm] = useState('');
  // What leaving the field does with the typed text. The caller sets it every
  // render, once the text and the selection it would change are known.
  const commitOnLeaveRef = useRef(() => {});

  // Keep the latest callbacks without making open/close depend on their identity.
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
  }, [onOpen, onClose]);

  // Callers use onOpen to fetch their options on every open.
  const openMenu = useCallback(() => {
    onOpenRef.current?.();
    setIsOpen(true);
  }, []);

  const closeMenu = useCallback(({ keepTyped = true } = {}) => {
    if (keepTyped) commitOnLeaveRef.current();
    setIsOpen(false);
    setSearchTerm('');
    onCloseRef.current?.();
  }, []);

  const closeAfterPick = useCallback(() => {
    setIsOpen(false);
    setSearchTerm('');
  }, []);

  return { isOpen, searchTerm, setSearchTerm, openMenu, closeMenu, closeAfterPick, commitOnLeaveRef };
};

export { useMenuOpenState };

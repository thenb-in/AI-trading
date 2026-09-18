import { useCallback, useEffect, useState } from 'react';

const storageKey = (userId) => `nbnext_app_guide_done_${userId || 'anonymous'}`;

const readDone = (userId) => {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey(userId)) || '[]'));
  } catch {
    return new Set();
  }
};

// The tours this user has finished, remembered in this browser.
const useGuideProgress = (userId) => {
  const [done, setDone] = useState(() => readDone(userId));

  // The user is known only once their profile loads, so read their progress again then.
  useEffect(() => {
    setDone(readDone(userId));
  }, [userId]);

  const markDone = useCallback((taskId) => {
    setDone((previous) => {
      if (previous.has(taskId)) return previous;
      const next = new Set(previous).add(taskId);
      try {
        localStorage.setItem(storageKey(userId), JSON.stringify([...next]));
      } catch {
        // Storage is off (private window): progress still holds for this visit.
      }
      return next;
    });
  }, [userId]);

  return { done, markDone };
};

export { useGuideProgress };

import { useState, useEffect } from 'react';
import { ApiService } from '@services/ApiService';

const IDLE = { status: 'idle', available: null };
const DEFAULT_DELAY = 450;
const DEFAULT_MIN_LENGTH = 2;

/**
 * Debounced uniqueness check for a field against the public availability
 * endpoint. Returns a status the UI can render: idle | checking | available |
 * taken | error. Generic on `type` ('company' | 'username' | …) so any screen —
 * the signup wizard, a profile edit, an admin "add user" form — can reuse it.
 *
 * Values are normalised the same way the server does (username is lower-cased,
 * everything is trimmed) so the answer matches what persistence will see.
 */
function useAvailabilityCheck(type, value, { minLength = DEFAULT_MIN_LENGTH, delay = DEFAULT_DELAY } = {}) {
  const [state, setState] = useState(IDLE);

  useEffect(() => {
    const trimmed = (value || '').trim();
    const normalized = type === 'username' ? trimmed.toLowerCase() : trimmed;

    if (normalized.length < minLength) {
      setState(IDLE);
      return undefined;
    }

    let active = true;
    setState({ status: 'checking', available: null });
    const timer = setTimeout(() => {
      ApiService.checkAvailability(type, normalized)
        .then((res) => {
          if (!active) return;
          const available = Boolean(res.data?.available);
          setState({ status: available ? 'available' : 'taken', available });
        })
        .catch(() => {
          if (active) setState({ status: 'error', available: null });
        });
    }, delay);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [type, value, minLength, delay]);

  return state;
}

export { useAvailabilityCheck };

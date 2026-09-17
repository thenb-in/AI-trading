import { useCallback, useEffect, useState } from 'react';
import { X, Info, AlertTriangle, AlertOctagon } from 'lucide-react';

import { announcementService } from '@services/announcementService';
import {
  ANNOUNCEMENT_SEVERITY_STYLE,
  ANNOUNCEMENT_DISMISSED_KEY
} from '@startup/constants/announcements';

const SEVERITY_ICON = { info: Info, warning: AlertTriangle, critical: AlertOctagon };

// An edited announcement is a new thing to say, so the dismissal is remembered
// against the version the reader dismissed, not against the announcement.
const stamp = (announcement) => `${announcement.id}:${announcement.updated_at}`;

const readDismissed = () => {
  const stored = window.localStorage.getItem(ANNOUNCEMENT_DISMISSED_KEY);
  return new Set(stored ? JSON.parse(stored) : []);
};

const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    announcementService
      .active()
      .then((response) => setAnnouncements(response.data?.data?.announcements ?? []))
      // A banner nobody could fetch is not worth a toast over the page the
      // reader actually asked for.
      .catch((error) => console.error(`Failed to load announcements: ${error.message}`));
  }, []);

  const dismiss = useCallback((announcement) => {
    setDismissed((current) => {
      const next = new Set(current).add(stamp(announcement));
      window.localStorage.setItem(ANNOUNCEMENT_DISMISSED_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const showing = announcements.filter((announcement) => !dismissed.has(stamp(announcement)));

  if (showing.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 px-4 pt-4">
      {showing.map((announcement) => {
        const Icon = SEVERITY_ICON[announcement.severity] || Info;
        return (
          <div
            key={announcement.id}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
              ANNOUNCEMENT_SEVERITY_STYLE[announcement.severity] || ANNOUNCEMENT_SEVERITY_STYLE.info
            }`}
          >
            <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{announcement.title}</p>
              <p className="whitespace-pre-line text-sm opacity-90">{announcement.body}</p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(announcement)}
              className="rounded p-1 transition-colors hover:bg-black/5"
              title="Dismiss this announcement"
              aria-label={`Dismiss ${announcement.title}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export { AnnouncementBanner };

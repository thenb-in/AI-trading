-- A drive file's object name is normally the master it belongs to, so its
-- attachment permission is attachment_<that master>. A few object names are
-- finer-grained slots on one master (a letter head's header and footer), which
-- have no permission of their own. The file now records the master whose
-- permission governs it, so the download request — which carries only the file
-- id — can still resolve the right permission. NULL means the object name is
-- the master, as it is for every ordinary record.
ALTER TABLE nbnext_drive
  ADD COLUMN IF NOT EXISTS permission_name VARCHAR(255);

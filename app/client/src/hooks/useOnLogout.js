import { useCallback } from 'react';
import { disconnectSocket } from '@startup/socket';
import { resetPunchReminderStorage } from '@app/components/attendance_punch_reminder/punchReminderService';

function useOnLogout() {
  return useCallback(() => {
    resetPunchReminderStorage();
    disconnectSocket();
  }, []);
}

export { useOnLogout };

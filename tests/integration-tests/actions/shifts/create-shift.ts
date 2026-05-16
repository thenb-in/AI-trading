import { ApiClient } from '../../helpers/apiClient';
import { TestLogger } from '../../helpers/logger';

export interface CreateShiftData {
  alias: string;
  cycle_unit?: number;
  shift_cycle?: number;
  work_weekend?: boolean;
  weekend_type?: number;
  work_day_off?: boolean;
  day_off_type?: number;
  auto_shift?: number;
  is_default?: boolean;
  [key: string]: any;
}

export interface Shift {
  id: number;
  alias: string;
  cycle_unit: number;
  shift_cycle: number;
  work_weekend: boolean;
  weekend_type: number;
  work_day_off: boolean;
  day_off_type: number;
  auto_shift: number;
  company_id: string;
  is_default: boolean;
}

export interface CreateShiftResult {
  success: boolean;
  message: string;
  data: Shift;
}

/**
 * Create shift action - creates a shift by creating a timetable
 * Shifts are created automatically when timetables are created in this system.
 */
export async function createShift(
  apiClient: ApiClient,
  logger: TestLogger,
  shiftData: CreateShiftData
): Promise<CreateShiftResult> {
  logger.logStep(`Creating timetable for shift: ${shiftData.alias}`, 'completed');

  // Create timetable - this automatically creates the shift
  const { createTimetable } = await import('../timetables/create-timetable');

  const timetableData = {
    alias: shiftData.alias,
    in_time: '09:00:00',
    checkout_time: '17:00:00',
    work_time_duration: 480,
  };

  const result = await createTimetable(apiClient, logger, timetableData);

  if (!result.success) {
    throw new Error(`Failed to create timetable: ${result.message}`);
  }

  // Get the actual shift that was created
  const shiftsResponse = await apiClient.get('/api/v1/shifts');
  const shifts = shiftsResponse.data?.data || [];
  const createdShift = shifts.find((s: Shift) => s.alias === shiftData.alias);

  if (!createdShift) {
    throw new Error('Timetable created but shift not found');
  }

  return {
    success: true,
    message: 'Shift created via timetable',
    data: createdShift,
  };
}

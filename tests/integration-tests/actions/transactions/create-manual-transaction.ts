import { ApiClient } from '../../helpers/apiClient';
import { TestLogger } from '../../helpers/logger';

export interface CreateManualTransactionData {
  punch_time: string; // ISO date string or format expected by API
  punch_state: number; // 0 for check-in, 1 for check-out
  employee_code: string;
  device_id?: string;
  remarks?: string;
  [key: string]: any;
}

export interface CreateManualTransactionResult {
  success: boolean;
  message: string;
  data: any;
}

/**
 * Create manual transaction action - creates a manual log entry (transaction)
 * @param apiClient - API client instance (must be authenticated)
 * @param logger - Test logger instance
 * @param transactionData - Manual transaction data
 * @returns CreateManualTransactionResult with created transaction data
 */
export async function createManualTransaction(
  apiClient: ApiClient,
  logger: TestLogger,
  transactionData: CreateManualTransactionData
): Promise<CreateManualTransactionResult> {
  try {
    logger.logStep(`Creating manual transaction for employee: ${transactionData.employee_code}`, 'completed');

    const response = await apiClient.post('/api/v1/manual-log', transactionData);

    if (response.status !== 201 && response.status !== 200) {
      const errorMessage = response.data?.error || response.data?.message || `Failed to create manual transaction with status ${response.status}`;
      logger.logStep('Create manual transaction failed', 'error', errorMessage);
      throw new Error(errorMessage);
    }

    const result = response.data;

    logger.logStep('Manual transaction created successfully', 'completed');

    return {
      success: result.success !== false, // Default to true if not specified
      message: result.message || 'Manual transaction created successfully',
      data: result.data || result,
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error during create manual transaction';
    logger.logStep('Create manual transaction action failed', 'error', errorMessage);
    throw error;
  }
}

import { closeConnection } from "../utils/db/connection";

export async function safeCloseConnection(): Promise<void> {
    try {
        await closeConnection();
        console.log('Database connection closed');
    } catch (error) {
        console.error('Failed to close database connection:', error);
    }
}

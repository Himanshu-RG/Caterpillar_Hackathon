import { apiClient } from './client';

export interface MaintenanceRecord {
  maintenance_id: string;
  timestamp: string;
  machine_id: string;
  maintenance_type: string;
  component: string;
  severity: string;
  engine_hours: number;
  description: string;
}

export async function createMaintenanceRequest(
  machineId: string,
  payload: { component: string; severity: string; description: string; engine_hours: number }
): Promise<MaintenanceRecord> {
  const response = await apiClient.post<MaintenanceRecord>(`/api/maintenance/${machineId}`, payload);
  return response.data;
}

import { apiClient } from './client';
import { SafetyAlert } from '../types/telematics';

export async function fetchRecentSafetyAlerts(limit = 20): Promise<SafetyAlert[]> {
  const res = await apiClient.get<SafetyAlert[]>('/api/safety/alerts', { params: { limit } });
  return res.data;
}

export async function fetchMachineSafetyEvents(machineId: string, limit = 20): Promise<SafetyAlert[]> {
  const res = await apiClient.get<SafetyAlert[]>(`/api/safety/${machineId}`, { params: { limit } });
  return res.data;
}

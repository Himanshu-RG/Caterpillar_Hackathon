import { apiClient } from './client';
import { Insight } from '../types/telematics';

export async function fetchInsights(machineId: string, status?: string, limit = 10): Promise<Insight[]> {
  const res = await apiClient.get<Insight[]>(`/api/insights/${machineId}`, {
    params: { status, limit },
  });
  return res.data;
}

export async function acknowledgeInsight(insightId: string): Promise<Insight> {
  const res = await apiClient.post<Insight>(`/api/insights/${insightId}/acknowledge`);
  return res.data;
}

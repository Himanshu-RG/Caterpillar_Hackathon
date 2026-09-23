import { apiClient } from './client';
import { FleetSummary } from '../types/telematics';

export async function fetchFleetSummary(): Promise<FleetSummary> {
  const res = await apiClient.get<FleetSummary>('/api/fleet/summary');
  return res.data;
}

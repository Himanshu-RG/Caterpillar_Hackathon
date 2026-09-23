import { apiClient } from './client';
import { Incident } from '../types/telematics';

export interface CreateIncidentPayload {
  machine_id: string;
  operator_id?: string;
  incident_type: string;
  severity: string;
  description: string;
  timestamp?: string;
}

export async function fetchIncidents(machineId?: string, limit = 50): Promise<Incident[]> {
  const res = await apiClient.get<Incident[]>('/api/incidents', {
    params: { machine_id: machineId, limit },
  });
  return res.data;
}

export async function createIncident(payload: CreateIncidentPayload): Promise<Incident> {
  const res = await apiClient.post<Incident>('/api/incidents', payload);
  return res.data;
}

import { apiClient } from './client';
import { Machine, MachineDashboard, DerivedHealth, MachineCurrentState } from '../types/telematics';

export async function fetchMachines(): Promise<Machine[]> {
  const res = await apiClient.get<Machine[]>('/api/machines');
  return res.data;
}

export async function fetchMachineById(machineId: string): Promise<Machine> {
  const res = await apiClient.get<Machine>(`/api/machines/${machineId}`);
  return res.data;
}

export async function fetchMachineDashboard(machineId: string): Promise<MachineDashboard> {
  const res = await apiClient.get<MachineDashboard>(`/api/machines/${machineId}/dashboard`);
  return res.data;
}

export async function fetchDerivedHealth(machineId: string): Promise<DerivedHealth> {
  const res = await apiClient.get<DerivedHealth>(`/api/machines/${machineId}/health`);
  return res.data;
}

export async function fetchCurrentState(machineId: string): Promise<MachineCurrentState> {
  const res = await apiClient.get<MachineCurrentState>(`/api/machines/${machineId}/state`);
  return res.data;
}

import { apiClient } from './client';
import { SimulatorScenario } from '../types/telematics';

export interface ScenariosResponse {
  scenarios: SimulatorScenario[];
  active_scenario: string | null;
  is_running: boolean;
}

export async function fetchSimulatorScenarios(): Promise<ScenariosResponse> {
  const res = await apiClient.get<ScenariosResponse>('/api/simulator/scenarios');
  return res.data;
}

export async function startSimulator(scenario: string, machineId?: string, speed = 2.0): Promise<any> {
  const res = await apiClient.post('/api/simulator/start', {
    scenario,
    machine_id: machineId,
    speed,
  });
  return res.data;
}

export async function stopSimulator(): Promise<any> {
  const res = await apiClient.post('/api/simulator/stop');
  return res.data;
}

export async function fetchSimulatorStatus(): Promise<any> {
  const res = await apiClient.get('/api/simulator/status');
  return res.data;
}

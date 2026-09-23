import { apiClient } from './client';
import { FailurePrediction, SafetyPrediction, TaskPrediction } from '../types/telematics';

export async function predictFailure(machineId: string): Promise<FailurePrediction> {
  const res = await apiClient.post<FailurePrediction>(`/api/predictions/failure/${machineId}`);
  return res.data;
}

export async function predictSafety(machineId: string): Promise<SafetyPrediction> {
  const res = await apiClient.post<SafetyPrediction>(`/api/predictions/safety/${machineId}`);
  return res.data;
}

export interface TaskPredictionParams {
  task_type: string;
  machine_id: string;
  operator_id: string;
  planned_quantity_tonnes: number;
  estimated_time_min: number;
  weather?: string;
  operator_skill?: string;
  machine_age_years?: number;
  current_elapsed_min?: number;
  completed_tonnes?: number;
}

export async function predictTaskTime(params: TaskPredictionParams): Promise<TaskPrediction> {
  const res = await apiClient.post<TaskPrediction>('/api/predictions/task-time', params);
  return res.data;
}

export async function fetchPredictionHistory(machineId: string, limit = 20): Promise<any[]> {
  const res = await apiClient.get<any[]>(`/api/predictions/${machineId}/history`, { params: { limit } });
  return res.data;
}

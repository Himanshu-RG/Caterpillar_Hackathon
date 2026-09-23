import { apiClient } from './client';
import { Task } from '../types/telematics';

export async function fetchTodaysTasks(limit = 50): Promise<Task[]> {
  const res = await apiClient.get<Task[]>('/api/tasks/today', { params: { limit } });
  return res.data;
}

export async function fetchTaskById(taskId: string): Promise<Task> {
  const res = await apiClient.get<Task>(`/api/tasks/${taskId}`);
  return res.data;
}

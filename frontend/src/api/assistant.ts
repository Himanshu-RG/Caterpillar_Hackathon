import { apiClient } from './client';
import { ChatResponse } from '../types/telematics';

export async function askAssistant(machineId: string, message: string): Promise<ChatResponse> {
  const res = await apiClient.post<ChatResponse>('/api/assistant/chat', {
    machine_id: machineId,
    message,
  });
  return res.data;
}

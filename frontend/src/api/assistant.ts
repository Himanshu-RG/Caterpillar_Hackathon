import { apiClient } from './client';
import { ChatResponse, AssistantStatus } from '../types/telematics';

export async function askAssistant(
  machineId: string,
  message: string,
  apiKey?: string
): Promise<ChatResponse> {
  const res = await apiClient.post<ChatResponse>('/api/assistant/chat', {
    machine_id: machineId,
    message,
    api_key: apiKey || undefined,
  });
  return res.data;
}

export async function getAssistantStatus(): Promise<AssistantStatus> {
  const res = await apiClient.get<AssistantStatus>('/api/assistant/status');
  return res.data;
}

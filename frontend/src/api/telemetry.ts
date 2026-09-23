import { apiClient } from './client';

export interface TelemetryPoint {
  timestamp: string;
  machine_id: string;
  engine_rpm: number;
  engine_load_pct: number;
  coolant_temp_c: number;
  oil_pressure_bar: number;
  oil_temperature_c: number;
  hydraulic_temp_c: number;
  hydraulic_pressure_bar: number;
  fuel_rate_l_hr: number;
  speed_kmh: number;
  payload_tonnes: number;
  seatbelt_status: boolean;
  proximity_alert: boolean;
  overspeed_alert: boolean;
  unsafe_operation: boolean;
  fault_code: string;
}

export async function fetchTelemetryHistory(machineId: string, limit = 100): Promise<TelemetryPoint[]> {
  const res = await apiClient.get<TelemetryPoint[]>(`/api/machines/${machineId}/telemetry`, {
    params: { limit },
  });
  return res.data;
}

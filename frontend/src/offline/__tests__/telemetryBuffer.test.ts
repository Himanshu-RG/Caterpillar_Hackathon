import { describe, it, expect, beforeEach } from 'vitest';
import { telemetryBuffer } from '../telemetryBuffer';
import { WebSocketTelemetryPayload } from '../../types/telematics';

describe('TelemetryBuffer', () => {
  beforeEach(() => {
    telemetryBuffer.clear();
  });

  it('buffers telemetry packets and tracks last updated time', () => {
    const packet: WebSocketTelemetryPayload = {
      machine_id: 'EXC007',
      timestamp: '2026-09-23T14:30:00Z',
      telemetry: {
        rpm: 1720,
        load_pct: 60,
        coolant_temp: 84,
        oil_pressure: 4.1,
        hydraulic_temp: 72,
        hydraulic_pressure: 250,
      },
      safety: {
        seatbelt: true,
        proximity: false,
      },
      predictions: {},
      insights: [],
    };

    telemetryBuffer.addPacket(packet);

    expect(telemetryBuffer.getBufferedCount()).toBe(1);
    expect(telemetryBuffer.getLastItem()?.telemetry.rpm).toBe(1720);
    expect(telemetryBuffer.getLastUpdatedTimestamp()).toBe('2026-09-23T14:30:00Z');
  });

  it('maintains bounded rolling capacity', () => {
    for (let i = 0; i < 950; i++) {
      telemetryBuffer.addPacket({
        machine_id: 'EXC007',
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        telemetry: {
          rpm: 1000 + i,
        },
        safety: {},
        predictions: {},
        insights: [],
      });
    }

    // Must be bounded to 900
    expect(telemetryBuffer.getBufferedCount()).toBe(900);
  });
});

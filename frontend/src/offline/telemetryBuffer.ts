import { WebSocketTelemetryPayload } from '../types/telematics';

export interface BufferedTelemetryItem {
  timestamp: string;
  machineId: string;
  receivedAt: number; // Date.now()
  telemetry: NonNullable<WebSocketTelemetryPayload['telemetry']>;
  safety?: WebSocketTelemetryPayload['safety'];
  predictions?: WebSocketTelemetryPayload['predictions'];
}

const STORAGE_KEY = 'cat_in_cab_telemetry_buffer';
const LAST_KNOWN_KEY = 'cat_in_cab_last_known_state';
const MAX_BUFFER_SIZE = 900; // ~15 minutes at 1 packet per second

class TelemetryBuffer {
  private buffer: BufferedTelemetryItem[] = [];
  private lastUpdated: string | null = null;

  constructor() {
    this.loadFromStorage();
  }

  public addPacket(packet: WebSocketTelemetryPayload): void {
    if (!packet || !packet.telemetry) return;

    const item: BufferedTelemetryItem = {
      timestamp: packet.timestamp || new Date().toISOString(),
      machineId: packet.machine_id,
      receivedAt: Date.now(),
      telemetry: packet.telemetry,
      safety: packet.safety,
      predictions: packet.predictions,
    };

    this.buffer.push(item);
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.buffer.shift();
    }

    this.lastUpdated = item.timestamp;
    this.persistToStorage(item);
  }

  public getBuffer(): BufferedTelemetryItem[] {
    return [...this.buffer];
  }

  public getLastItem(): BufferedTelemetryItem | null {
    if (this.buffer.length === 0) return null;
    return this.buffer[this.buffer.length - 1];
  }

  public getLastUpdatedTimestamp(): string | null {
    return this.lastUpdated;
  }

  public getLastFormattedTime(): string {
    if (!this.lastUpdated) return 'Unknown';
    try {
      const date = new Date(this.lastUpdated);
      return isNaN(date.getTime())
        ? this.lastUpdated.slice(11, 19)
        : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return this.lastUpdated;
    }
  }

  public getBufferedCount(): number {
    return this.buffer.length;
  }

  public clear(): void {
    this.buffer = [];
    this.lastUpdated = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LAST_KNOWN_KEY);
    } catch {
      // ignore
    }
  }

  private persistToStorage(latestItem: BufferedTelemetryItem): void {
    try {
      // Save last known item immediately
      localStorage.setItem(LAST_KNOWN_KEY, JSON.stringify(latestItem));

      // Periodically persist sample of buffer every 10 packets to avoid heavy storage thrash
      if (this.buffer.length % 10 === 0) {
        const sliceToSave = this.buffer.slice(-120); // Last 2 minutes in storage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sliceToSave));
      }
    } catch {
      // quota or private browsing safeguard
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.buffer = JSON.parse(stored);
      }
      const lastKnown = localStorage.getItem(LAST_KNOWN_KEY);
      if (lastKnown) {
        const parsed = JSON.parse(lastKnown) as BufferedTelemetryItem;
        this.lastUpdated = parsed.timestamp;
        if (this.buffer.length === 0) {
          this.buffer.push(parsed);
        }
      }
    } catch {
      this.buffer = [];
    }
  }
}

export const telemetryBuffer = new TelemetryBuffer();
export default telemetryBuffer;

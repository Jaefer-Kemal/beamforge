'use client';

export type WSConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'fallback_sim';

export interface WSResponseFrame {
  channel: number;
  type: string;
  id?: string;
  payload: any;
}

class WSMultiplexer {
  private ws: WebSocket | null = null;
  private status: WSConnectionStatus = 'disconnected';
  private statusListeners: Array<(status: WSConnectionStatus) => void> = [];
  private messageListeners: Array<(frame: WSResponseFrame) => void> = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private url: string = 'ws://localhost:8080/ws';

  constructor() {
    if (typeof window !== 'undefined') {
      this.initConnection();
    }
  }

  public connect(): void {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.initConnection();
  }

  public onStatusChange(callback: (status: WSConnectionStatus) => void): () => void {
    this.statusListeners.push(callback);
    callback(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter((cb) => cb !== callback);
    };
  }

  public onMessage(callback: (frame: WSResponseFrame) => void): () => void {
    this.messageListeners.push(callback);
    return () => {
      this.messageListeners = this.messageListeners.filter((cb) => cb !== callback);
    };
  }

  public isConnected(): boolean {
    return this.status === 'connected';
  }

  public sendTerminalCommand(command: string): void {
    this.sendFrame(1, 'command', { command });
  }

  public syncFiles(files: Record<string, string>): void {
    this.sendFrame(2, 'sync', { files });
  }

  public triggerLiveKillProcess(pid: string): void {
    this.sendFrame(4, 'kill_process', { pid });
  }

  public triggerLiveXmppHandshake(): void {
    this.sendFrame(4, 'xmpp_handshake', {});
  }

  public triggerLiveVerification(exerciseId: string, files: Record<string, string>): void {
    this.sendFrame(5, 'run_verification', { exercise_id: exerciseId, files });
  }

  private sendFrame(channel: number, type: string, payload: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    const frame = {
      channel,
      type,
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      payload,
    };
    this.ws.send(JSON.stringify(frame));
  }

  private initConnection(): void {
    if (typeof window === 'undefined') return;

    try {
      this.updateStatus('connecting');
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.updateStatus('connected');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const frame: WSResponseFrame = JSON.parse(event.data);
          this.messageListeners.forEach((cb) => cb(frame));
        } catch (e) {
          console.error('[WS Multiplexer] Error parsing frame', e);
        }
      };

      this.ws.onclose = () => {
        this.updateStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.updateStatus('disconnected');
      };
    } catch {
      this.updateStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private updateStatus(newStatus: WSConnectionStatus): void {
    this.status = newStatus;
    this.statusListeners.forEach((cb) => cb(newStatus));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.initConnection();
    }, 3000);
  }
}

export const wsMux = new WSMultiplexer();

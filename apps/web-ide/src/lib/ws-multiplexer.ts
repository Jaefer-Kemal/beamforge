'use client';

import { getOrchestratorWsUrl } from './orchestratorConfig';

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
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private url: string = getOrchestratorWsUrl();

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

  public triggerLiveVerification(exerciseId: string, files: Record<string, string>, visibleTests?: any[]): void {
    this.sendFrame(5, 'run_verification', { exercise_id: exerciseId, files, visible_tests: visibleTests || [] });
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
      this.url = getOrchestratorWsUrl();
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.updateStatus('connected');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        this.startHeartbeat();
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
        this.stopHeartbeat();
        this.updateStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.stopHeartbeat();
        this.updateStatus('disconnected');
      };
    } catch {
      this.stopHeartbeat();
      this.updateStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    // Keep-alive heartbeat every 25s prevents Render's 100s proxy timeout from dropping the stream
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendFrame(0, 'ping', { ts: Date.now() });
      }
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private updateStatus(newStatus: WSConnectionStatus): void {
    this.status = newStatus;
    this.statusListeners.forEach((cb) => cb(newStatus));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    // Exponential backoff: 3s, 4.5s, 6.75s, 10s... capped at 30s
    const delay = Math.min(30000, Math.round(3000 * Math.pow(1.5, Math.min(this.reconnectAttempts, 5))));
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.initConnection();
    }, delay);
  }
}

export const wsMux = new WSMultiplexer();

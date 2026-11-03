/**
 * BeamForge Orchestrator Connection Configuration
 * Resolves local dev vs cloud deployment (Vercel + Render / EthioDeploy).
 */

const RAW_HTTP = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://localhost:8080';

export const ORCHESTRATOR_HTTP_URL = RAW_HTTP.replace(/\/+$/, '');

export const getOrchestratorWsUrl = (): string => {
  if (process.env.NEXT_PUBLIC_ORCHESTRATOR_WS_URL) {
    return process.env.NEXT_PUBLIC_ORCHESTRATOR_WS_URL;
  }
  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    if (RAW_HTTP.startsWith('https://')) {
      return RAW_HTTP.replace(/^https:\/\//, 'wss://') + '/ws';
    }
    if (RAW_HTTP.startsWith('http://')) {
      return (isHttps ? 'wss://' : 'ws://') + RAW_HTTP.replace(/^http:\/\//, '') + '/ws';
    }
  }
  return 'ws://localhost:8080/ws';
};


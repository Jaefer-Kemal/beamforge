/**
 * BeamForge Orchestrator Connection Configuration
 * Resolves local dev vs cloud deployment (Vercel + Render / EthioDeploy).
 */

const RENDER_PROD_HTTP = 'https://beamforge-orchestrator.onrender.com';
const RENDER_PROD_WS = 'wss://beamforge-orchestrator.onrender.com/ws';

export const getOrchestratorHttpUrl = (): string => {
  if (process.env.NEXT_PUBLIC_ORCHESTRATOR_URL) {
    return process.env.NEXT_PUBLIC_ORCHESTRATOR_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    // If the browser loaded the page over HTTPS on any public domain (like Vercel),
    // Mixed Content policy strictly blocks http:// and ws:// to localhost.
    // Default to the live Render cloud orchestrator.
    const isHttps = window.location.protocol === 'https:';
    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isHttps && !isLocalHost) {
      return RENDER_PROD_HTTP;
    }
  }
  return 'http://localhost:8080';
};

export const getOrchestratorWsUrl = (): string => {
  let wsUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_WS_URL;
  if (!wsUrl) {
    const httpUrl = getOrchestratorHttpUrl();
    if (httpUrl.startsWith('https://')) {
      wsUrl = httpUrl.replace(/^https:\/\//, 'wss://');
    } else if (httpUrl.startsWith('http://')) {
      wsUrl = httpUrl.replace(/^http:\/\//, 'ws://');
    } else {
      wsUrl = 'ws://localhost:8080';
    }
  }
  // Strip trailing slashes, then guarantee /ws endpoint
  wsUrl = wsUrl.replace(/\/+$/, '');
  if (!wsUrl.endsWith('/ws')) {
    wsUrl += '/ws';
  }
  return wsUrl;
};

export const ORCHESTRATOR_HTTP_URL = (function () {
  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isHttps && !isLocalHost && !process.env.NEXT_PUBLIC_ORCHESTRATOR_URL) {
      return RENDER_PROD_HTTP;
    }
  }
  return (process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://localhost:8080').replace(/\/+$/, '');
})();



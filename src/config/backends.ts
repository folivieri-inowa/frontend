/**
 * Configurazione Multi-Backend per Genesis
 * 
 * Mappa username IG -> backend path
 */

export interface BackendConfig {
  username: string;
  label: string;
  apiPath: string;
  wsPath: string;
}

// Modalità sviluppo locale: punta direttamente al backend
const isDev = import.meta.env.DEV;

// Lista backend disponibili per la dropdown
export const AVAILABLE_BACKENDS: BackendConfig[] = [
  {
    username: 'boban_16',
    label: 'Francesco',
    apiPath: isDev ? 'http://localhost:3001' : '/api/francesco',
    wsPath: isDev ? 'ws://localhost:3002' : '/ws/francesco',
  },
  {
    username: 'fiordok',
    label: 'Marco',
    apiPath: isDev ? 'http://localhost:3001' : '/api/marco',
    wsPath: isDev ? 'ws://localhost:3002' : '/ws/marco',
  },
  {
    username: 'dmatera79',
    label: 'Daniele',
    apiPath: isDev ? 'http://localhost:3001' : '/api/daniele',
    wsPath: isDev ? 'ws://localhost:3002' : '/ws/daniele',
  },
  {
    username: 'Pinturicchio25',
    label: 'Davide',
    apiPath: isDev ? 'http://localhost:3001' : '/api/davide',
    wsPath: isDev ? 'ws://localhost:3002' : '/ws/davide',
  },
];

// Mappatura username IG -> backend (per compatibilità)
export const BACKEND_CONFIGS: Record<string, BackendConfig> = Object.fromEntries(
  AVAILABLE_BACKENDS.map(b => [b.username, b])
);

// Username lowercase per matching case-insensitive
export const BACKEND_CONFIGS_LOWERCASE: Record<string, BackendConfig> = 
  Object.fromEntries(
    Object.entries(BACKEND_CONFIGS).map(([k, v]) => [k.toLowerCase(), v])
  );

/**
 * Trova la configurazione backend per un username IG
 */
export function getBackendConfig(igUsername: string): BackendConfig | null {
  // Prima prova match esatto
  if (BACKEND_CONFIGS[igUsername]) {
    return BACKEND_CONFIGS[igUsername];
  }
  // Poi prova case-insensitive
  return BACKEND_CONFIGS_LOWERCASE[igUsername.toLowerCase()] || null;
}

/**
 * Trova la configurazione backend per label
 */
export function getBackendByLabel(label: string): BackendConfig | null {
  return AVAILABLE_BACKENDS.find(b => b.label === label) || null;
}

/**
 * Costruisce l'URL API completo
 */
export function getApiUrl(config: BackendConfig): string {
  // In DEV apiPath è già l'URL completo (http://localhost:3001)
  // In PROD è un path relativo (/api/francesco)
  if (config.apiPath.startsWith('http')) {
    return config.apiPath;
  }
  return config.apiPath;
}

/**
 * Costruisce l'URL WebSocket completo
 */
export function getWsUrl(config: BackendConfig): string {
  // In DEV wsPath è già l'URL completo (ws://localhost:3002)
  // In PROD costruisci da host corrente
  if (config.wsPath.startsWith('ws')) {
    return config.wsPath;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${config.wsPath}`;
}

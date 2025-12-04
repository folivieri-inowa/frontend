import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BackendConfig, getBackendByLabel, getApiUrl, getWsUrl } from '@/config/backends';

interface AuthState {
  // Stato autenticazione
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Dati utente
  igUsername: string | null;
  backendConfig: BackendConfig | null;
  
  // URL dinamici
  apiUrl: string;
  wsUrl: string;
  
  // Azioni
  login: (backendLabel: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      igUsername: null,
      backendConfig: null,
      apiUrl: '',
      wsUrl: '',

      login: async (backendLabel: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          // 1. Trova il backend dalla label selezionata
          const config = getBackendByLabel(backendLabel);
          
          if (!config) {
            set({ 
              isLoading: false, 
              error: `Backend "${backendLabel}" non trovato.` 
            });
            return false;
          }

          // 2. Costruisci URL API
          const apiUrl = getApiUrl(config);
          const wsUrl = getWsUrl(config);

          // 3. Verifica credenziali con il backend (senza API key)
          const response = await fetch(`${apiUrl}/api/auth/verify`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              username: config.username, 
              password 
            }),
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            set({ 
              isLoading: false, 
              error: data.error || 'Password non valida' 
            });
            return false;
          }

          // 4. Login riuscito
          set({
            isAuthenticated: true,
            isLoading: false,
            error: null,
            igUsername: config.username,
            backendConfig: config,
            apiUrl,
            wsUrl,
          });

          // Force page reload per reinizializzare tutti i componenti con i nuovi URL
          window.location.reload();

          return true;

        } catch (err) {
          set({ 
            isLoading: false, 
            error: 'Errore di connessione. Riprova più tardi.' 
          });
          return false;
        }
      },

      logout: () => {
        set({
          isAuthenticated: false,
          igUsername: null,
          backendConfig: null,
          apiUrl: '',
          wsUrl: '',
          error: null,
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'genesis-auth',
      // Non persistere password o dati sensibili
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        igUsername: state.igUsername,
        backendConfig: state.backendConfig,
        apiUrl: state.apiUrl,
        wsUrl: state.wsUrl,
      }),
    }
  )
);

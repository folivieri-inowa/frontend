# Genesis Trading Dashboard

Dashboard professionale per monitoraggio e controllo del trading bot Genesis.

## 🎨 Features

### ✅ Implementate

- **Dashboard Overview**: Visualizzazione real-time di balance, equity, P&L, posizioni attive e ordini
- **Header**: Status sistema, sessione IG, toggle dark/light mode
- **Sidebar**: Navigazione collassabile con animazioni smooth
- **Console**: Log system con export, filtering e auto-scroll
- **Statistics**: Metriche di performance (win rate, total profit, drawdown, etc.)
- **WebSocket Connection**: Auto-reconnect, gestione eventi real-time
- **Dark Mode**: Switch automatico con persistenza localStorage
- **Responsive Design**: Layout adattivo per mobile/tablet/desktop
- **Smooth Animations**: Framer Motion per transizioni fluide

### 🚧 In Sviluppo

- **Settings**: Configurazione parametri strategia (profit reinvest %, max contracts)
- **Manual Trading**: Form per esecuzione trade manuale
- **Positions View**: Vista dettagliata posizioni con controlli avanzati
- **Backend API**: Endpoints REST per configurazione e controlli

## 🚀 Quick Start

### Installazione

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Il frontend sarà disponibile su `http://localhost:5173`

Il proxy Vite reindirizzerà automaticamente:
- `/api/*` → `http://localhost:3001` (Backend REST API)
- WebSocket → `ws://localhost:3002` (Eventi real-time)

### Build Production

```bash
npm run build
npm run preview  # Preview build di produzione
```

## 📁 Struttura

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # UI components (Card, Badge, Button)
│   │   ├── Header.tsx       # Top bar con status e controls
│   │   ├── Sidebar.tsx      # Menu navigazione
│   │   ├── Dashboard.tsx    # Overview principale
│   │   ├── ConsoleView.tsx  # Visualizzazione logs
│   │   └── StatisticsView.tsx  # Statistiche performance
│   ├── hooks/
│   │   └── useWebSocket.ts  # WebSocket connection hook
│   ├── lib/
│   │   └── utils.ts         # Utility functions (formatting, colors)
│   ├── types/
│   │   └── trading.types.ts # TypeScript interfaces
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Tailwind + custom styles
├── package.json
├── vite.config.ts           # Vite config con proxy
├── tailwind.config.js       # Tailwind theme customization
└── tsconfig.json            # TypeScript configuration
```

## 🎨 Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool ultra-veloce
- **Tailwind CSS** - Utility-first CSS
- **Framer Motion** - Animazioni fluide
- **Lucide React** - Icon set moderno
- **Zustand** (ready) - State management (se necessario)

## 🔌 WebSocket Events

Il frontend gestisce i seguenti eventi WebSocket dal backend:

```typescript
SYSTEM_STATUS    // Status generale sistema
ACCOUNT_UPDATE   // Aggiornamento balance/equity
POSITION_UPDATE  // Aggiornamento posizione
ORDER_UPDATE     // Aggiornamento ordine
TRADE_CONFIRM    // Conferma esecuzione trade
CONSOLE_LOG      // Log eventi
```

## 🎯 Prossimi Step

### Backend API Endpoints (da implementare)

```typescript
// Configurazione strategia
POST /api/strategy/config
{
  epic: string
  profitReinvestPercentage: number
  maxContracts: number
}

// Trade manuale
POST /api/trade/manual
{
  epic: string
  direction: 'LONG' | 'SHORT'
  contracts: number
  tpLevel?: number
}

// Controllo strumento
POST /api/instrument/:epic/start
POST /api/instrument/:epic/stop

// Statistiche
GET /api/statistics
```

### Frontend Components (da completare)

1. **SettingsView**: Form configurazione parametri con validation (React Hook Form + Zod)
2. **ManualTradeForm**: Esecuzione trade manuale con confirmation modal
3. **PositionsView**: Tabella avanzata con sorting/filtering (TanStack Table)
4. **Toast Notifications**: Feedback visivo per azioni utente

## 🎨 Design System

### Colors

- **Primary**: Blue (info, links)
- **Success**: Green (profitti, long positions)
- **Error**: Red (perdite, short positions)
- **Warning**: Yellow (alerts)
- **Info**: Blue light (informazioni)

### Animations

```typescript
// Fade in
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}

// Slide in
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}

// Stagger children
staggerChildren: 0.05
```

### Dark Mode

Usa `dark:` prefix di Tailwind:

```tsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
```

## 📊 Screenshot

*(Da aggiungere dopo deploy)*

## 🐛 Known Issues

- Statistics attualmente usa dati mock (backend API da implementare)
- Positions View placeholder (da implementare tabella avanzata)
- Settings View placeholder (da implementare form configurazione)

## 📝 License

Proprietario - Genesis Trading System

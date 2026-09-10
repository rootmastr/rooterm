# ROOTERM - SISTEM APLIKASI LENGKAP

> File ini dibuat untuk AI agent agar memahami seluruh sistem RooTerm saat pengembangan di masa depan.
> Terakhir diperbarui: 2026-09-10

---

## 1. RINGKASAN PROYEK

**RooTerm** adalah aplikasi web SSH terminal client dengan AI assistant terintegrasi. Pengguna dapat:
- Mengelola banyak koneksi SSH server melalui browser
- Menggunakan AI (Ollama LLM) untuk suggest perintah, menjelaskan error, menjalankan perintah langsung di terminal
- Menggunakan sebagai Electron desktop app

### Informasi Server
| Item | Nilai |
|------|-------|
| Domain | `rootmastr.space` |
| Server IP | `111.68.31.232` |
| Frontend Port | `8087` |
| Backend Port | `3001` |
| Ollama Port | `11434` |
| GitHub Repo | `https://github.com/rootmastr/rooterm` (Public) |

### Login Default
- Username: `admin`
- Password: `m4sy44ll4h`

---

## 2. TECH STACK

### Frontend
| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| React | 19.2.4 | UI Framework |
| Vite | 8.0.4 | Build tool & dev server |
| Tailwind CSS | 3.4.19 | Styling |
| xterm.js | 5.3.0 | Terminal emulator di browser |
| Socket.IO Client | 4.8.3 | WebSocket untuk SSH real-time |
| Framer Motion | 12.38.0 | Animasi UI |
| Lucide React | 1.7.0 | Icons |
| Axios | 1.15.0 | HTTP client |

### Backend
| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| Express | 4.21.2 | HTTP server |
| Socket.IO | 4.8.1 | WebSocket server |
| ssh2 | 1.16.0 | SSH client (Node.js) |
| jsonwebtoken | 9.0.3 | Autentikasi JWT |
| bcryptjs | 3.0.3 | Hashing password |
| Ollama | - | AI LLM (llama3:latest) |

### Desktop (Opsional)
| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| Electron | 41.1.1 | Desktop app framework |

---

## 3. ARSITEKTUR SISTEM

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                   │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Sidebar  │  │  Terminal    │  │      AI Panel          │ │
│  │  Hosts   │  │   Tabs       │  │  (SSE Streaming)       │ │
│  │  Groups  │  │  xterm.js    │  │  Chat / Command Panel  │ │
│  └──────────┘  └──────────────┘  └────────────────────────┘ │
│                                                              │
│  Komunikasi: Socket.IO (SSH I/O) + REST API (AI/Auth)       │
└─────────────────────────────────────────────────────────────┘
                           │
                    Port 8087 (Nginx)
                           │
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Express + Socket.IO)               │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │ sshService   │  │ ollamaService │  │ contextService   │  │
│  │ (SSH Client) │  │ (AI Client)   │  │ (Server Info)    │  │
│  └──────────────┘  └───────────────┘  └──────────────────┘  │
│                                                              │
│  Port 3001                                                   │
└─────────────────────────────────────────────────────────────┘
                           │
                    Port 11434 (Ollama)
                           │
┌─────────────────────────────────────────────────────────────┐
│                    OLLAMA SERVER (AI)                        │
│  Model: llama3:latest                                        │
│  Embedding: nomic-embed-text                                 │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow SSH
```
User Input (xterm.js)
    │
    ▼
onData callback → sshClient.sendInput()
    │
    ▼ (Socket.IO)
socket.emit('ssh:input')
    │
    ▼
sshService.sendData() → SSH Stream.write()
    │
    ▼
Remote Server → SSH Stream.on('data')
    │
    ▼
socket.emit('ssh:data:{sessionId}')
    │
    ▼
sshClient.emit() → onData callback
    │
    ▼
xterm.write(data) → Display di browser
```

### Data Flow AI
```
User Query di AI Panel
    │
    ▼
POST /ai/stream (SSE)
    │
    ▼
┌─────────────────────────────┐
│ 1. collectContext(sessionId)│ ← SSH exec commands
│ 2. internetService.search() │ ← DuckDuckGo
│ 3. ragService.retrieve()    │ ← Vector Store
│ 4. ollamaService.stream()   │ ← Ollama LLM
│ 5. safetyService.analyze()  │ ← Pattern check
└─────────────────────────────┘
    │
    ▼ (SSE Stream)
Response ke Frontend (explanation + command + safety)
```

---

## 4. STRUKTUR FOLDER

```
rooterm/
├── src/                          # Frontend source
│   ├── main.jsx                  # Entry point React
│   ├── App.jsx                   # Komponen utama
│   ├── config.js                 # API_URL, SOCKET_URL
│   ├── index.css                 # Global styles
│   ├── components/               # Semua komponen UI
│   │   ├── Login.jsx             # Form login
│   │   ├── Sidebar.jsx           # Panel kiri (host list)
│   │   ├── TopBar.jsx            # Navigation bar atas
│   │   ├── StatusBar.jsx         # Status bar bawah (latency)
│   │   ├── XTermTerminal.jsx     # Wrapper xterm.js
│   │   ├── TerminalTab.jsx       # Tab SSH terminal
│   │   ├── AddHostPanel.jsx      # Panel add/edit host
│   │   ├── AIPanel.jsx           # AI chat panel
│   │   ├── AICommandPanel.jsx    # AI command panel
│   │   └── AIToggleButton.jsx    # Tombol toggle AI
│   ├── context/
│   │   ├── AuthContext.jsx        # State autentikasi
│   │   └── AIContext.jsx          # State AI panel
│   ├── hooks/
│   │   └── useHostStore.js        # State host & tab
│   ├── services/
│   │   └── sshClient.js           # SSH client (Socket/IPC)
│   └── main/electron/
│       ├── main.js                # Electron main process
│       └── preload.cjs            # Electron preload
│
├── server/                       # Backend source
│   ├── index.js                  # Entry point Express
│   ├── hashPassword.js           # Utility hash password
│   ├── data/
│   │   └── users.json            # Data user (admin)
│   ├── controllers/
│   │   ├── authController.js     # Login/me
│   │   ├── aiController.js       # AI query/stream/suggest
│   │   └── ragController.js      # RAG ingest/query
│   ├── events/
│   │   └── socketHandler.js      # Socket.IO SSH bridge
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT protect
│   └── services/
│       ├── sshService.js          # SSH connection manager
│       ├── ollamaService.js       # Ollama LLM client
│       ├── contextService.js      # Server info collector
│       ├── safetyService.js       # Dangerous command check
│       ├── cacheService.js        # TTL cache
│       ├── internetService.js     # Web scraper
│       ├── learningService.js     # Self-improving feedback
│       └── rag/
│           ├── ragService.js      # RAG engine
│           └── vectorStore.js     # Vector DB
│
├── deploy-server.sh              # Script deploy ke server
├── push2.sh                      # Script push ke GitHub
├── .env.example                  # Frontend env template
├── server/.env.example           # Backend env template
├── vite.config.js                # Vite config
├── tailwind.config.js            # Tailwind config
└── package.json                  # Frontend dependencies
```

---

## 5. KOMPONEN FRONTEND

### 5.1 App.jsx - Komponen Utama
- Authentication gate: tampilkan `<Login />` jika belum login
- Layout: TopBar → Sidebar + Terminal + AIPanel → StatusBar
- State: `isAddPanelOpen`, `editingHost`, `hostToDelete`
- Keyboard shortcut: `Ctrl+N` = Add Host, `Ctrl+K` = Toggle AI Panel
- Dispatch `terminal-run-command` event untuk menjalankan perintah AI di terminal

### 5.2 Login.jsx
- Form username + password
- Glassmorphism UI dengan animated blobs
- Panggil `AuthContext.login()`

### 5.3 Sidebar.jsx
- Host list terorganisasi dalam group (folder)
- Search/filter hosts
- Right-click context menu: Edit/Remove host, Rename/Delete group
- Footer: "Vault Secure" indicator + host count

### 5.4 TerminalTab.jsx
- Bridge antara xterm.js dan SSH connection
- States: `connecting`, `ready`, `error`
- Connection guards (anti duplicate connect via refs)
- 15 detik timeout koneksi
- Listen `terminal-run-command` event untuk inject AI commands
- Dispatch `terminal-error-detected` saat detect error di output
- Fetch server context saat READY

### 5.5 XTermTerminal.jsx
- Reusable wrapper xterm.js
- Expose methods via ref: `write`, `writeln`, `clear`, `focus`, `refresh`, `fit`
- Auto-resize via ResizeObserver
- Config: `scrollback: 10000`, `cursorBlink: true`, `allowProposedApi: true`

### 5.6 AddHostPanel.jsx
- Slide-in panel dari kanan
- Mode: Add (create) atau Edit (update) - deteksi dari prop `editHost`
- Form: Host/IP, Label, Group (chip + custom), Port, Username, Password
- Group selection: chip existing groups + free text input

### 5.7 AIPanel.jsx
- Chat-style interface
- Streaming SSE response dari `/ai/stream`
- Quick command cards
- Safety warning untuk dangerous commands
- "Run Command" button → dispatch `terminal-run-command`

### 5.8 StatusBar.jsx
- Connection status, host info, auth method
- Real-time latency (ping `/health` setiap 5 detik)
- Warna: hijau <100ms, kuning <300ms, merah >300ms

---

## 6. STATE MANAGEMENT

### 6.1 AuthContext
- `user`, `token`, `loading`
- Token disimpan di `localStorage: rootmastr_token`
- `login(username, password)` → POST `/api/auth/login`
- `logout()` → clear token, user, SSH socket

### 6.2 AIContext
- `isOpen` (panel visible), `hasSuggestion`
- `isOpen` disimpan di `localStorage: isAIOpen`
- Keyboard: `Ctrl+K` toggle, `Esc` close

### 6.3 useHostStore
- `hosts` (disimpan di `localStorage: rooterm_hosts`)
- `activeTabs`, `activeTabId`
- CRUD: `addHost`, `deleteHost`, `updateHost`
- Group: `renameGroup`, `deleteGroup`
- Tab: `connectToHost`, `closeTab`, `closeAllTabsForHost`

---

## 7. BACKEND API ROUTES

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/auth/login` | ❌ | Login user |
| GET | `/api/auth/me` | ✅ | Get user info |
| GET | `/health` | ❌ | Health check |
| POST | `/ai/query` | ✅ | AI query (non-streaming) |
| POST | `/ai/stream` | ✅ | AI query (SSE streaming) |
| POST | `/ai/suggest` | ✅ | Command suggestions |
| POST | `/ai/rag/ingest` | ✅ | Ingest dokumen ke RAG |
| POST | `/ai/rag/stream` | ✅ | RAG query (SSE streaming) |
| POST | `/ai/rag/feedback` | ✅ | Command feedback |
| GET | `/server/context/:sessionId` | ✅ | Server context info |

### Socket.IO Events
| Event | Arah | Deskripsi |
|-------|------|-----------|
| `ssh:connect` | Client → Server | Membuat koneksi SSH |
| `ssh:input` | Client → Server | Mengirim keystrokes |
| `ssh:resize` | Client → Server | Resize terminal |
| `ssh:disconnect` | Client → Server | Disconnect session |
| `ssh:data:{sessionId}` | Server → Client | Terminal output |
| `ssh:event:{sessionId}` | Server → Client | Lifecycle events |

---

## 8. SERVER SERVICES

### 8.1 sshService.js
- `Map<sessionId, { conn, stream }>` untuk menyimpan sessions
- `createSession()`: Buat SSH connection, buat shell dengan PTY xterm-256color
- `sendData()`: Tulis data ke shell stream
- `resize()`: `stream.setWindow(rows, cols)`
- `disconnect()`: End stream + connection

### 8.2 ollamaService.js
- URL: `http://111.68.31.232:11434`
- Model: `llama3:latest`
- Embedding: `nomic-embed-text`
- `generateStream()`: Streaming via NDJSON
- `getEmbedding()`: Generate embeddings

### 8.3 contextService.js
- `collectContext(sessionId)`: Jalankan 7 commands via SSH
  - OS, kernel, uptime, RAM, disk, user, CPU
- Cache per session

### 8.4 safetyService.js
- Pattern regex untuk detect commands berbahaya
- `rm -rf /`, `mkfs`, `dd`, fork bomb, `chmod 777 /`
- Return: `{ isDangerous, risk, description }`

### 8.5 internetService.js
- Search DuckDuckGo HTML
- Scrape top 2 results
- Cache 1 hour
- Intent detection: INSTALLATION, TROUBLESHOOTING, INFO_QUERY

### 8.6 learningService.js
- Self-improving feedback loop
- Success → ingest "VERIFIED SUCCESSFUL COMMAND" ke RAG
- Failure → diagnose + ingest "RESOLVED FAILURE" ke RAG

### 8.7 RAG Pipeline (ragService.js + vectorStore.js)
- Chunk text (500 char)
- Embed via Ollama nomic-embed-text
- Store di in-memory vector DB (cosine similarity)
- Persist ke `server/data/vector_store.json`
- Retrieve top-K (3) documents

---

## 9. AUTENTIKASI

### Flow Login
1. User submit username + password
2. Backend bcrypt compare dengan `users.json`
3. Return JWT token (30 hari expiry)
4. Frontend simpan token di `localStorage: rootmastr_token`
5. Set token di `sshClient.socket.auth.token`

### Protected Routes
- Header: `Authorization: Bearer <token>`
- Middleware `protect` verify JWT
- Socket.IO: token di `socket.handshake.auth.token`

---

## 10. DEPLOYMENT

### Flow Deploy
```
Mac (Development) → GitHub → Server (Pull & Deploy)
```

### push2.sh (Dari Mac)
```bash
./push2.sh "commit message"
# 1. git add .
# 2. git commit
# 3. git push origin main
```

### deploy-server.sh (Di Server)
```bash
cd /www/wwwroot/rootmastr.space
git pull origin main
./deploy-server.sh
```

### Isi deploy-server.sh
1. Set git safe directory untuk aaPanel
2. Set remote ke public HTTPS
3. `git fetch --all` + `git reset --hard origin/main`
4. Check prerequisites (node, npm, pm2)
5. `npm install` + `npm run build` dengan env vars production
6. Install backend dependencies
7. Buat `server/.env` jika belum ada
8. PM2 restart `rooterm-backend`

### Build Frontend dengan Env Vars
```bash
VITE_API_URL="http://rootmastr.space:8087" \
VITE_SOCKET_URL="http://rootmastr.space:8087" \
npm run build
```

### Nginx Config (Port 8087)
- Serve static files dari `dist/`
- Try files → `index.html` (SPA routing)
- Cache static assets 1 tahun

---

## 11. CONFIGURATION FILES

### src/config.js
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://rootmastr.space:8087';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://rootmastr.space:8087';
```

### server/.env
```
JWT_SECRET=<random>
PORT=3001
NODE_ENV=production
OLLAMA_URL=http://localhost:11434
```

### vite.config.js
- Preview port: 8087
- Host: true (network access)

### tailwind.config.js
- Custom theme: GitHub Dark colors
- Background: #0D1117
- Accent: #58A6FF

---

## 12. FITUR UTAMA

### 12.1 SSH Terminal
- Multi-tab connections
- Real-time I/O via Socket.IO
- PTY support (xterm-256color)
- Auto-resize terminal
- Command history (xterm.js scrollback: 10000)

### 12.2 AI Assistant
- Streaming responses (SSE)
- Context-aware (server info + internet data)
- Command suggestions
- Safety warnings
- Self-learning feedback loop
- Quick action presets

### 12.3 Host Management
- CRUD hosts dengan groups
- Right-click context menu
- Search/filter
- LocalStorage persistence

### 12.4 Keamanan
- JWT authentication
- Password hashing (bcrypt)
- Dangerous command detection
- SSH credentials disimpan di localStorage (client-side)

---

## 13. TROUBLESHOOTING

### Login Failed
```bash
# Cek backend logs
pm2 logs rooterm-backend --lines 20

# Cek users.json
cat /www/wwwroot/rootmastr.space/server/data/users.json
```

### Frontend Tidak Update
```bash
# Clear cache browser (Ctrl+Shift+R)
# Atau rebuild di server
cd /www/wwwroot/rootmastr.space
rm -rf dist
npm run build
```

### SSH Connection Error
```bash
# Cek backend logs
pm2 logs rooterm-backend --lines 50

# Test SSH manual dari server
ssh user@target-host -p 22
```

### Ollama AI Error
```bash
# Cek Ollama running
curl http://localhost:11434/api/tags

# Cek model available
ollama list
```

### Port 3001 Tidak Bisa Diakses
```bash
# Buka firewall
sudo ufw allow 3001/tcp
sudo ufw reload

# Atau gunakan Nginx reverse proxy
```

---

## 14. PERINTAH UMUM

### Development (Mac)
```bash
npm run dev          # Start Vite dev server
npm run server       # Start backend
npm run build        # Build production
npm run lint         # Run ESLint
```

### Server Management
```bash
pm2 list                    # List all processes
pm2 logs rooterm-backend    # View logs
pm2 restart rooterm-backend # Restart backend
pm2 save                    # Save process list
pm2 startup                 # Auto-start on boot
```

### Git
```bash
git status                  # Check changes
./push2.sh "message"        # Push to GitHub
git pull origin main        # Pull latest
```

---

## 15. CATATAN PENTING

1. **Repo GitHub Public** - Tidak perlu credentials untuk pull
2. **Server Path** - `/www/wwwroot/rootmastr.space` (aaPanel)
3. **Branch** - `main` (bukan master)
4. **PM2 Process** - `rooterm-backend`
5. **Frontend Port** - 8087 (Nginx)
6. **Backend Port** - 3001
7. **Ollama** - Remote di `111.68.31.232:11434` (IP yang sama)
8. **Password Admin** - `m4sy44ll4h`
9. **JWT Expiry** - 30 hari
10. **LocalStorage Keys**:
    - `rootmastr_token` → JWT auth token
    - `rooterm_hosts` → Host list
    - `isAIOpen` → AI panel state

---

## 16. DEVELOPMENT FUTURE

### Yang Perlu Diperbaiki
- CORS hardening (ganti `origin: '*'` dengan domain spesifik)
- HTTPS (Let's Encrypt SSL)
- SSH key authentication (bukan password)
- Error handling yang lebih baik
- Unit tests
- TypeScript migration

### Fitur Baru yang Bisa Ditambahkan
- File transfer (SFTP)
- Multiple user support dengan roles
- Command history/search
- Session recording
- Team collaboration
- Mobile responsive
- Notification system
- Audit logging

---

*File ini dibuat untuk membantu AI agent memahami sistem RooTerm. Update file ini saat ada perubahan signifikan pada aplikasi.*

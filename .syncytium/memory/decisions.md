---
decisions:
  - id: ADR-001
    title: Adopt SyncytiumMD as Universal Context Bridge
    status: accepted
    date: '2026-09-19'
    context: >-
      Multiple AI agents and IDEs (Cursor, Claude Code, Copilot, Cline,
      Antigravity, etc.) are used concurrently, leading to fragmented context
      and duplicated rules.
    decision: >-
      Use SyncytiumMD as the single source of truth (.syncytium/) to transpile
      and synchronize rules, memories, and handoff state across all AI coding
      tools.
    consequences: >-
      All tools stay in sync with zero manual copy-pasting. Changes in rules
      propagate automatically to all connected IDEs and CLIs.
  - id: ADR-002
    title: Stealth BrowserWindow & Hybrid Login for Google Auth in Electron 28
    status: accepted
    date: '2026-09-19'
    context: >-
      Electron 28 runs Node 18, which lacks node:sqlite. Windows Chrome SQLite cookie
      files are locked (EBUSY) when Chrome is open.
    decision: >-
      Use an isolated stealth BrowserWindow with Chrome 131 User-Agent and login-preload.js
      direct to Electron session cookie jar, plus external browser (shell.openExternal), CDP,
      and manual cookie paste fallback options.
    consequences: >-
      100% reliable Google login without native sqlite dependencies or file lock crashes.
  - id: ADR-003
    title: Origin Isolation & Bearer Token Security for Port 9863 REST API
    status: accepted
    date: '2026-09-19'
    context: >-
      Local REST API was exposed to external websites via broad CORS, allowing malicious
      origins to read playback state or invoke unauthorized commands.
    decision: >-
      Block unauthorized external web origins with HTTP 403 Forbidden. Validate state-mutating
      requests with cryptographically secure Bearer token (crypto.randomBytes), while allowing
      local loopback and authorized domain (aqualitymusic.vercel.app).
    consequences: >-
      Robust security compliance preventing cross-origin data leakage.
  - id: ADR-004
    title: Graceful Gateway Fallback for Discord Bot Privileged Intents
    status: accepted
    date: '2026-09-19'
    context: >-
      Bot crashed on startup with DISALLOWED_INTENTS if GuildMembers / GuildPresences intents
      were disabled in Discord Developer Portal.
    decision: >-
      Implement multi-tier fallback: attempt full intents first; if DisallowedIntents is thrown,
      gracefully fallback to standard intents (Guilds, GuildMessages, MessageContent) and pull
      playback presence from local REST API (Port 9863) or Spotify.
    consequences: >-
      Discord bot never crashes on startup due to missing privileged gateway intents.
  - id: ADR-005
    title: AudioBridge YouTube IFrame Engine for React Native Mobile
    status: accepted
    date: '2026-09-17'
    context: >-
      Direct YouTube stream extraction on mobile frequently breaks due to cipher and token
      rotations, and Expo AV does not support raw YouTube streams directly.
    decision: >-
      Use a hidden WebView hosting YouTube IFrame player (AudioBridge) bridging postMessage
      events to native playback controls.
    consequences: >-
      Stable audio playback on both Android and iOS without cipher breakage.
  - id: ADR-006
    title: Spotify-Parity Synced Lyrics, Queue Drawer and Global Shortcuts
    status: accepted
    date: '2026-09-20'
    context: >-
      Aquality Music lacked synced lyrics, live queue drawer, and rich keyboard navigation,
      hindering parity with premium music desktop clients like Spotify.
    decision: >-
      Implement glassmorphic slide-over panels for lyrics and queue, timestamp-synced LRC
      karaoke parser with smooth auto-centering, interactive queue with Now Playing and item
      removal, and Spotify-standard global keyboard shortcuts (Space, Ctrl+Arrows, L, Q, M, Esc).
    consequences: >-
      Elevates user experience to commercial Spotify grade with zero latency.
---
# Architectural Decision Records (ADR)

### [ADR-001] Adopt SyncytiumMD as Universal Context Bridge
- **Status:** accepted
- **Date:** 2026-09-19

**Context:**
Multiple AI agents and IDEs (Cursor, Claude Code, Copilot, Cline, Antigravity, etc.) are used concurrently, leading to fragmented context and duplicated rules.

**Decision:**
Use SyncytiumMD as the single source of truth (.syncytium/) to transpile and synchronize rules, memories, and handoff state across all AI coding tools.

**Consequences:**
All tools stay in sync with zero manual copy-pasting. Changes in rules propagate automatically to all connected IDEs and CLIs.

---

### [ADR-002] Stealth BrowserWindow & Hybrid Login for Google Auth in Electron 28
- **Status:** accepted
- **Date:** 2026-09-19

**Context:**
Electron 28 runs Node 18, which lacks `node:sqlite`. In addition, Chrome SQLite cookie databases are locked (`EBUSY`) on Windows while Chrome is running.

**Decision:**
Implement a hybrid Google login architecture featuring an isolated stealth `BrowserWindow` (Chrome 131 UA, `login-preload.js`, automated redirect interception directly into Electron session cookie jar), external system browser (`shell.openExternal`), CDP inspection, and fallback cookie paste.

**Consequences:**
Eliminates all native SQLite runtime dependencies and file-lock crashes. Google login works reliably across all environments.

---

### [ADR-003] Origin Isolation & Bearer Token Security for Port 9863 REST API
- **Status:** accepted
- **Date:** 2026-09-19

**Context:**
Local REST API on port 9863 allowed open origin reflection, exposing player state and control endpoints to any browser tab visiting untrusted sites.

**Decision:**
Enforce origin verification (reject unauthorized web origins with HTTP 403 Forbidden), restrict permitted origins to `localhost`, `127.0.0.1`, and `https://aqualitymusic.vercel.app`, and mandate Bearer token authentication for state mutation.

**Consequences:**
Restores strict security compliance (Rule 4) and completely prevents cross-origin unauthorized control.

---

### [ADR-004] Graceful Gateway Fallback for Discord Bot Privileged Intents
- **Status:** accepted
- **Date:** 2026-09-19

**Context:**
The Discord bot hard-required `GuildMembers` and `GuildPresences` gateway intents. If disabled in the Discord Developer Portal, the bot immediately crashed with `[DISALLOWED_INTENTS]`.

**Decision:**
Implement a two-tier startup handler: attempt connection with full intents; if `DISALLOWED_INTENTS` occurs, catch it and immediately reconnect using standard intents (`Guilds`, `GuildMessages`, `MessageContent`), querying track state via local REST API (Port 9863) or Spotify fallback.

**Consequences:**
Bot never crashes on startup due to portal permissions.

---

### [ADR-005] AudioBridge YouTube IFrame Engine for React Native Mobile
- **Status:** accepted
- **Date:** 2026-09-17

**Context:**
Direct stream URL extraction for YouTube videos frequently breaks due to cipher transformations and InnerTube changes.

**Decision:**
Utilize an invisible WebView running YouTube IFrame API (`AudioBridge`) that communicates bidirectionally via `postMessage` with the React Native state store.

**Consequences:**
Guarantees uninterrupted audio streaming on both Android and iOS without cipher maintenance overhead.

---

### [ADR-006] Spotify-Parity Synced Lyrics, Queue Drawer and Global Shortcuts
- **Status:** accepted
- **Date:** 2026-09-20

**Context:**
Aquality Music lacked synced lyrics, interactive queue drawer, and rich keyboard navigation, hindering parity with premium music desktop clients like Spotify.

**Decision:**
Implement glassmorphic slide-over panels for lyrics and queue, timestamp-synced LRC karaoke parser with smooth auto-centering, interactive queue with Now Playing and item removal, and Spotify-standard global keyboard shortcuts (Space, Ctrl+Arrows, L, Q, M, Esc).

**Consequences:**
Elevates user experience to commercial Spotify grade with zero latency.

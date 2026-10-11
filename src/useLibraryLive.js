import { useEffect, useRef } from 'react';
import { api } from './services-api';

export function useLibraryLive(userId, refresh) {
  const callback = useRef(refresh);
  callback.current = refresh;
  useEffect(() => {
    if (!userId) return undefined;
    let active = true, polling = false, initialized = false, after = 0, socket = null, retry = null, attempt = 0, handshake = null;
    const poll = async () => {
      if (!active || polling || document.hidden || !navigator.onLine) return;
      polling = true;
      try {
        let changed = false;
        for (let page = 0; page < 10 && active; page++) {
          const events = await api.get(`/platform/events?after=${after}&limit=100`);
          if (!active || !Array.isArray(events)) break;
          for (const event of events) {
            const id = Number(event.id);
            if (!Number.isSafeInteger(id) || id <= after) continue;
            after = id;
            if (initialized && /^game\.(published|updated|deleted)$/.test(event.event_type || '')) changed = true;
          }
          if (events.length < 100) { initialized = true; break; }
        }
        if (changed && active) callback.current();
      } catch {} finally { polling = false; }
    };
    const reconnect = () => {
      if (!active || retry) return;
      retry = setTimeout(() => { retry = null; connect(); }, Math.min(30000, 1000 * 2 ** Math.min(attempt++, 5)));
    };
    const connect = async () => {
      if (!active || !navigator.onLine) { reconnect(); return; }
      try {
        const result = await api.get('/platform/live-ticket');
        if (!active || !result?.ticket) { reconnect(); return; }
        socket = new WebSocket(`wss://api-ust8.onrender.com/api/live?ticket=${encodeURIComponent(result.ticket)}`);
        let authenticated = false;
        socket.onopen = () => { handshake = setTimeout(() => { if (!authenticated) socket?.close(); }, 8000); };
        socket.onmessage = (message) => {
          try {
            const event = JSON.parse(message.data);
            if (event.type === 'connected') {
              authenticated = event.authenticated === true;
              if (!authenticated) socket?.close();
              else { attempt = 0; clearTimeout(handshake); poll(); }
            } else if (authenticated) poll();
          } catch {}
        };
        socket.onclose = () => { clearTimeout(handshake); socket = null; reconnect(); };
        socket.onerror = () => socket?.close();
      } catch { reconnect(); }
    };
    poll().finally(() => { if (active) connect(); });
    const timer = setInterval(poll, 15000);
    const visibility = () => { if (!document.hidden) poll(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { active = false; clearInterval(timer); clearTimeout(retry); clearTimeout(handshake); document.removeEventListener('visibilitychange', visibility); if (socket) { socket.onclose = null; socket.close(); } };
  }, [userId]);
}

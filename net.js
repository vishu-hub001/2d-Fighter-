// Thin WebSocket wrapper. Handlers: Game.Net.onmsg(obj), Game.Net.onclose()
Game.Net = {
  ws: null, onmsg: null, onclose: null,
  connect(onOpen) {
    if (this.ws && this.ws.readyState === 1) return onOpen();
    this.close();
    const ws = this.ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    ws.onopen = onOpen;
    ws.onmessage = e => { try { this.onmsg && this.onmsg(JSON.parse(e.data)); } catch (_) {} };
    ws.onclose = () => { if (this.ws === ws) { this.ws = null; this.onclose && this.onclose(); } };
  },
  send(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); },
  close() { const w = this.ws; this.ws = null; if (w) w.close(); }
};

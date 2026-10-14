// src/server/sse.js
class SSEManager {
  constructor() {
    // Map of channelCode -> Set of response objects
    this.clients = new Map();
  }

  addClient(channelCode, res) {
    if (!this.clients.has(channelCode)) {
      this.clients.set(channelCode, new Set());
    }

    const channelClients = this.clients.get(channelCode);
    channelClients.add(res);

    // Send initial connected confirmation
    this.sendToClient(res, 'connected', {
      channel: channelCode,
      timestamp: new Date().toISOString()
    });

    // Cleanup on disconnect
    res.on('close', () => {
      channelClients.delete(res);
      if (channelClients.size === 0) {
        this.clients.delete(channelCode);
      }
    });
  }

  sendToClient(res, event, data) {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error('Error sending SSE message:', err);
    }
  }

  broadcast(channelCode, event, data) {
    const channelClients = this.clients.get(channelCode);
    if (!channelClients || channelClients.size === 0) {
      return 0;
    }

    let count = 0;
    for (const client of channelClients) {
      this.sendToClient(client, event, data);
      count++;
    }
    return count;
  }

  broadcastAll(event, data) {
    let total = 0;
    for (const [channelCode] of this.clients) {
      total += this.broadcast(channelCode, event, data);
    }
    return total;
  }
}

export const sseManager = new SSEManager();

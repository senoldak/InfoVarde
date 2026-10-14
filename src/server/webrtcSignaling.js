// src/server/webrtcSignaling.js
import { WebSocketServer, WebSocket } from 'ws';

/**
 * WebRTC Signaling Server for Lifeline VoIP emergency audio calls.
 * Zero-PII: Rooms are identified only by ephemeral session tokens or room tags.
 */
export function setupWebRtcSignaling(server) {
  const wss = new WebSocketServer({ noServer: true });
  const rooms = new Map(); // roomTag -> Set of ws clients

  // Handle HTTP upgrade on /ws/lifeline
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === '/ws/lifeline') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    let currentRoom = null;
    let clientRole = 'unknown';

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        const { type, room, role, sdp, candidate } = data;

        if (type === 'join') {
          currentRoom = room;
          clientRole = role || 'resident';

          if (!rooms.has(currentRoom)) {
            rooms.set(currentRoom, new Set());
          }
          const roomSet = rooms.get(currentRoom);
          roomSet.add(ws);

          ws.send(JSON.stringify({
            type: 'joined',
            room: currentRoom,
            role: clientRole,
            peerCount: roomSet.size
          }));

          // Notify other peers in room
          for (const peer of roomSet) {
            if (peer !== ws && peer.readyState === WebSocket.OPEN) {
              peer.send(JSON.stringify({
                type: 'peer-joined',
                role: clientRole,
                peerCount: roomSet.size
              }));
            }
          }
          return;
        }

        if (!currentRoom || !rooms.has(currentRoom)) {
          return;
        }

        const roomSet = rooms.get(currentRoom);

        // Relay signaling messages (offer, answer, ice-candidate, hangup)
        if (['offer', 'answer', 'ice-candidate', 'hangup'].includes(type)) {
          for (const peer of roomSet) {
            if (peer !== ws && peer.readyState === WebSocket.OPEN) {
              peer.send(JSON.stringify({
                type,
                room: currentRoom,
                fromRole: clientRole,
                sdp,
                candidate
              }));
            }
          }
        }
      } catch (err) {
        console.error('WebRTC signaling parse error:', err.message);
      }
    });

    ws.on('close', () => {
      if (currentRoom && rooms.has(currentRoom)) {
        const roomSet = rooms.get(currentRoom);
        roomSet.delete(ws);

        for (const peer of roomSet) {
          if (peer.readyState === WebSocket.OPEN) {
            peer.send(JSON.stringify({
              type: 'peer-left',
              role: clientRole,
              peerCount: roomSet.size
            }));
          }
        }

        if (roomSet.size === 0) {
          rooms.delete(currentRoom);
        }
      }
    });
  });

  return {
    wss,
    rooms,
    close: () => {
      for (const client of wss.clients) {
        client.terminate();
      }
      wss.close();
    }
  };
}

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = process.env.PORT || 3000;

// MIME types mapping
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// Winning combinations for 3x3 Tic-Tac-Toe
const WIN_COMBOS = [
  { line: [0, 1, 2], dir: 'row-0' },
  { line: [3, 4, 5], dir: 'row-1' },
  { line: [6, 7, 8], dir: 'row-2' },
  { line: [0, 3, 6], dir: 'col-0' },
  { line: [1, 4, 7], dir: 'col-1' },
  { line: [2, 5, 8], dir: 'col-2' },
  { line: [0, 4, 8], dir: 'diag-main' },
  { line: [2, 4, 6], dir: 'diag-anti' },
];

function checkWinner(board) {
  for (const combo of WIN_COMBOS) {
    const [a, b, c] = combo.line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: combo.line, direction: combo.dir };
    }
  }
  return null;
}

function isDraw(board) {
  if (checkWinner(board)) return false;
  return board.every((c) => c !== null);
}

// Connect Four 7x6 logic
const C4_ROWS = 6;
const C4_COLS = 7;

function getLowestEmptyC4Row(board, col) {
  for (let r = C4_ROWS - 1; r >= 0; r--) {
    if (board[r * C4_COLS + col] === null) return r;
  }
  return -1;
}

function checkC4Winner(board) {
  const get = (r, c) => (r >= 0 && r < C4_ROWS && c >= 0 && c < C4_COLS) ? board[r * C4_COLS + c] : null;

  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      const p = get(r, c);
      if (!p) continue;
      // Horizontal
      if (c + 3 < C4_COLS && p === get(r, c+1) && p === get(r, c+2) && p === get(r, c+3)) {
        return { winner: p, line: [r*C4_COLS+c, r*C4_COLS+c+1, r*C4_COLS+c+2, r*C4_COLS+c+3], direction: 'horizontal' };
      }
      // Vertical
      if (r + 3 < C4_ROWS && p === get(r+1, c) && p === get(r+2, c) && p === get(r+3, c)) {
        return { winner: p, line: [r*C4_COLS+c, (r+1)*C4_COLS+c, (r+2)*C4_COLS+c, (r+3)*C4_COLS+c], direction: 'vertical' };
      }
      // Diagonal down-right
      if (r + 3 < C4_ROWS && c + 3 < C4_COLS && p === get(r+1, c+1) && p === get(r+2, c+2) && p === get(r+3, c+3)) {
        return { winner: p, line: [r*C4_COLS+c, (r+1)*C4_COLS+c+1, (r+2)*C4_COLS+c+2, (r+3)*C4_COLS+c+3], direction: 'diag-down' };
      }
      // Diagonal up-right
      if (r - 3 >= 0 && c + 3 < C4_COLS && p === get(r-1, c+1) && p === get(r-2, c+2) && p === get(r-3, c+3)) {
        return { winner: p, line: [r*C4_COLS+c, (r-1)*C4_COLS+c+1, (r-2)*C4_COLS+c+2, (r-3)*C4_COLS+c+3], direction: 'diag-up' };
      }
    }
  }
  return null;
}

// -------------------------------------------------------------
// 1. Static HTTP File Server (SPA Support)
// -------------------------------------------------------------
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';

  let filePath = path.join(DIST_DIR, reqPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for Single Page Application routing
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
      });
      res.end(content);
    });
  });
});

// -------------------------------------------------------------
// 2. Real-Time Online Multiplayer WebSocket Engine
// -------------------------------------------------------------
const wss = new WebSocketServer({ server });

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length));
  }
  return code;
}

// In-memory room store: roomCode -> RoomState
const rooms = new Map();

function broadcastToRoom(roomCode, payload) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const msg = JSON.stringify(payload);
  if (room.hostSocket && room.hostSocket.readyState === WebSocket.OPEN) {
    room.hostSocket.send(msg);
  }
  if (room.guestSocket && room.guestSocket.readyState === WebSocket.OPEN) {
    room.guestSocket.send(msg);
  }
}

function sanitizeRoomData(room) {
  return {
    roomCode: room.roomCode,
    status: room.status,
    hostId: room.hostId,
    playerX: room.playerX,
    playerO: room.playerO,
    board: room.board,
    currentTurn: room.currentTurn,
    winner: room.winner,
    winningCells: room.winningCells,
    winningDirection: room.winningDirection,
    scores: room.scores,
    createdAt: room.createdAt,
    lastMove: room.lastMove,
    gameVersion: room.gameVersion,
    rematchRequestedBy: room.rematchRequestedBy,
    gameType: room.gameType || 'ttt',
    lastEmote: room.lastEmote || null,
  };
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  let currentRoomCode = null;
  let currentRole = null; // 'host' | 'guest'

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      const { type } = data;

      // --- CREATE ROOM ---
      if (type === 'CREATE_ROOM') {
        const roomCode = generateRoomCode();
        const hostId = data.hostId || 'host_' + Date.now();
        const hostName = data.hostName || 'Player 1';
        const gameType = data.gameType || 'ttt'; // 'ttt' | 'blitz' | 'c4'
        const isC4 = gameType === 'c4';

        const newRoom = {
          roomCode,
          gameType,
          status: 'waiting',
          hostId,
          playerX: { id: hostId, name: hostName },
          playerO: null,
          board: isC4 ? Array(42).fill(null) : Array(9).fill(null),
          currentTurn: isC4 ? 'cyan' : 'X',
          winner: null,
          winningCells: [],
          winningDirection: null,
          scores: isC4 ? { cyan: 0, violet: 0, draws: 0 } : { X: 0, O: 0, draws: 0 },
          createdAt: Date.now(),
          lastMove: null,
          gameVersion: 1,
          rematchRequestedBy: null,
          lastEmote: null,
          hostSocket: ws,
          guestSocket: null,
        };

        rooms.set(roomCode, newRoom);
        currentRoomCode = roomCode;
        currentRole = 'host';

        ws.send(JSON.stringify({
          type: 'ROOM_CREATED',
          roomCode,
          room: sanitizeRoomData(newRoom),
        }));
      }

      // --- JOIN ROOM ---
      else if (type === 'JOIN_ROOM') {
        const code = (data.roomCode || '').trim().toUpperCase();
        const guestId = data.guestId || 'guest_' + Date.now();
        const guestName = data.guestName || 'Player O';

        const room = rooms.get(code);
        if (!room) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found. Please verify the code.' }));
          return;
        }

        if (room.guestSocket && room.guestSocket.readyState === WebSocket.OPEN && room.playerO && room.playerO.id !== guestId) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is already full.' }));
          return;
        }

        room.playerO = { id: guestId, name: guestName };
        room.guestSocket = ws;
        room.status = 'playing';
        currentRoomCode = code;
        currentRole = 'guest';

        const sanitized = sanitizeRoomData(room);

        // Notify guest of successful join
        ws.send(JSON.stringify({ type: 'ROOM_JOINED', roomCode: code, room: sanitized }));

        // Notify host that opponent joined and game is live!
        broadcastToRoom(code, { type: 'ROOM_UPDATED', room: sanitized });
      }

      // --- SUBSCRIBE / RECONNECT ---
      else if (type === 'SUBSCRIBE') {
        const code = (data.roomCode || '').trim().toUpperCase();
        const { clientId, role } = data;
        const room = rooms.get(code);
        if (room) {
          currentRoomCode = code;
          if (role === 'host' || room.hostId === clientId) {
            room.hostSocket = ws;
            currentRole = 'host';
          } else if (role === 'guest' || (room.playerO && room.playerO.id === clientId)) {
            room.guestSocket = ws;
            currentRole = 'guest';
          }
          ws.send(JSON.stringify({ type: 'ROOM_UPDATED', room: sanitizeRoomData(room) }));
        } else {
          ws.send(JSON.stringify({ type: 'ROOM_NOT_FOUND', roomCode: code }));
        }
      }

      // --- MAKE MOVE ---
      else if (type === 'MAKE_MOVE') {
        let { roomCode, cellIndex, col, player } = data;
        const room = rooms.get(roomCode);
        if (!room) return;

        if (room.winner !== null) return;
        if (room.currentTurn !== player) return;

        const isC4 = room.gameType === 'c4';

        if (isC4) {
          if (col === undefined && cellIndex !== undefined) {
            col = cellIndex % C4_COLS;
          }
          if (col === undefined || col < 0 || col >= C4_COLS) return;
          const row = getLowestEmptyC4Row(room.board, col);
          if (row === -1) return; // Column full

          cellIndex = row * C4_COLS + col;
          room.board[cellIndex] = player;

          const win = checkC4Winner(room.board);
          const draw = room.board.every((c) => c !== null);

          if (win) {
            room.winner = win.winner;
            room.winningCells = win.line;
            room.winningDirection = win.direction;
            room.scores[win.winner] += 1;
            room.status = 'finished';
          } else if (draw) {
            room.winner = 'draw';
            room.scores.draws += 1;
            room.status = 'finished';
          } else {
            room.currentTurn = player === 'cyan' ? 'violet' : 'cyan';
          }
        } else {
          // Classic Tic-Tac-Toe & Speed Blitz
          if (room.board[cellIndex] !== null) return;
          room.board[cellIndex] = player;

          const win = checkWinner(room.board);
          const draw = isDraw(room.board);

          if (win) {
            room.winner = win.winner;
            room.winningCells = win.line;
            room.winningDirection = win.direction;
            room.scores[win.winner] += 1;
            room.status = 'finished';
          } else if (draw) {
            room.winner = 'draw';
            room.scores.draws += 1;
            room.status = 'finished';
          } else {
            room.currentTurn = player === 'X' ? 'O' : 'X';
          }
        }

        room.gameVersion += 1;
        room.lastMove = {
          index: cellIndex,
          player,
          timestamp: Date.now(),
        };

        broadcastToRoom(roomCode, {
          type: 'ROOM_UPDATED',
          room: sanitizeRoomData(room),
        });
      }

      // --- SEND EMOTE / TAUNT ---
      else if (type === 'SEND_EMOTE') {
        const { roomCode, emote, senderName, senderId, sound } = data;
        const room = rooms.get(roomCode);
        if (room) {
          room.lastEmote = { emote, senderName, senderId, sound, timestamp: Date.now() };
          broadcastToRoom(roomCode, {
            type: 'EMOTE_RECEIVED',
            emote,
            senderName,
            senderId,
            sound,
            timestamp: Date.now(),
          });
        }
      }

      // --- REQUEST REMATCH ---
      else if (type === 'REMATCH') {
        const { roomCode, requesterId } = data;
        const room = rooms.get(roomCode);
        if (!room) return;

        if (room.rematchRequestedBy && room.rematchRequestedBy !== requesterId) {
          // Both players agreed to rematch! Reset board
          const isC4 = room.gameType === 'c4';
          room.board = isC4 ? Array(42).fill(null) : Array(9).fill(null);
          room.currentTurn = isC4 ? 'cyan' : 'X';
          room.winner = null;
          room.winningCells = [];
          room.winningDirection = null;
          room.status = 'playing';
          room.rematchRequestedBy = null;
          room.gameVersion += 1;
          room.lastMove = null;
        } else {
          room.rematchRequestedBy = requesterId;
        }

        broadcastToRoom(roomCode, {
          type: 'ROOM_UPDATED',
          room: sanitizeRoomData(room),
        });
      }

      // --- LEAVE ROOM ---
      else if (type === 'LEAVE_ROOM') {
        if (currentRoomCode) {
          const room = rooms.get(currentRoomCode);
          if (room) {
            if (currentRole === 'host') {
              broadcastToRoom(currentRoomCode, { type: 'ROOM_CLOSED', message: 'Host has closed the room.' });
              rooms.delete(currentRoomCode);
            } else {
              room.playerO = null;
              room.guestSocket = null;
              room.status = 'waiting';
              broadcastToRoom(currentRoomCode, { type: 'OPPONENT_DISCONNECTED' });
            }
          }
        }
        currentRoomCode = null;
        currentRole = null;
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  // Handle Disconnect
  ws.on('close', () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        if (currentRole === 'host') {
          broadcastToRoom(currentRoomCode, { type: 'ROOM_CLOSED', message: 'Host disconnected.' });
          rooms.delete(currentRoomCode);
        } else {
          room.guestSocket = null;
          broadcastToRoom(currentRoomCode, { type: 'OPPONENT_DISCONNECTED' });
        }
      }
    }
  });
});

// Periodic ping to keep WebSocket connections alive on cloud platforms
const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(pingInterval);
});

// -------------------------------------------------------------
// 3. Start Server & Print Network Access IPs
// -------------------------------------------------------------
server.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  let localIP = 'localhost';

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        localIP = net.address;
        break;
      }
    }
  }

  console.log('\n======================================================');
  console.log('⚡ GLOSSY TIC-TAC-TOE SERVER IS RUNNING ONLINE!');
  console.log('======================================================');
  console.log(`📡 Local Access:    http://localhost:${PORT}`);
  console.log(`📱 Mobile/LAN:      http://${localIP}:${PORT}`);
  console.log(`🔌 WebSocket:       ws://${localIP}:${PORT}`);
  console.log('======================================================\n');
});

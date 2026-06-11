import type { WebSocketServer, WebSocket } from 'ws';
import type { ClientMessage, ServerMessage, Difficulty } from '../../shared/types.js';
import {
  createSession,
  handleNoteHit,
  handlePause,
  handleResume,
  handleQuit,
  endGame,
  getStateUpdate,
  reconnectSession,
  deleteSession,
} from './gameStateMachine.js';
import { saveGameResult, getSongById } from '../db/repositories.js';
import { validateGameStart, validateMessageType, validateGameSave } from '../middleware/security.js';

interface ClientSession {
  ws: WebSocket;
  sessionId: string;
  userId: string;
  lastHeartbeat: number;
}

const clients = new Map<string, ClientSession>();
const HEARTBEAT_TIMEOUT = 30000;
const STATE_BROADCAST_INTERVAL = 100;

export function setupWebSocket(wss: WebSocketServer) {
  console.log('[WebSocket] Service started');

  wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substring(2, 15);
    console.log(`[WebSocket] Client connected: ${clientId}`);

    clients.set(clientId, {
      ws,
      sessionId: '',
      userId: 'default_user',
      lastHeartbeat: Date.now(),
    });

    ws.on('message', (data) => {
      handleMessage(clientId, data.toString());
    });

    ws.on('close', () => {
      handleDisconnect(clientId);
    });

    ws.on('error', (error) => {
      console.error(`[WebSocket] Client ${clientId} error:`, error);
    });
  });

  setInterval(broadcastStateUpdates, STATE_BROADCAST_INTERVAL);
  setInterval(checkHeartbeats, 10000);
}

function handleMessage(clientId: string, data: string) {
  const client = clients.get(clientId);
  if (!client) return;

  try {
    const message: ClientMessage = JSON.parse(data);

    const typeValidation = validateMessageType(message.type);
    if (!typeValidation.valid) {
      sendError(client.ws, typeValidation.error || 'Invalid message type', 400);
      return;
    }

    client.lastHeartbeat = Date.now();

    switch (message.type) {
      case 'GAME_START':
        handleGameStart(clientId, message);
        break;
      case 'NOTE_HIT':
        handleNoteHitMessage(clientId, message);
        break;
      case 'GAME_PAUSE':
        handleGamePause(clientId);
        break;
      case 'GAME_RESUME':
        handleGameResume(clientId);
        break;
      case 'GAME_QUIT':
        handleGameQuit(clientId);
        break;
      case 'HEARTBEAT':
        send(client.ws, {
          type: 'HEARTBEAT_ACK',
          timestamp: Date.now(),
        });
        break;
    }
  } catch (error) {
    console.error('[WebSocket] Error parsing message:', error);
    sendError(client.ws, 'Invalid JSON format', 400);
  }
}

function handleGameStart(clientId: string, message: ClientMessage & { type: 'GAME_START' }) {
  const client = clients.get(clientId);
  if (!client) return;

  const validation = validateGameStart(message.songId, message.difficulty, message.userId);
  if (!validation.valid) {
    sendError(client.ws, validation.error || 'Invalid game start request', 400);
    return;
  }

  if (client.sessionId) {
    deleteSession(client.sessionId);
  }

  const result = createSession(message.userId, message.songId, message.difficulty as Difficulty);

  if ('error' in result) {
    sendError(client.ws, result.error, 404);
    return;
  }

  client.sessionId = result.session.id;
  client.userId = message.userId;

  const song = getSongById(message.songId);
  send(client.ws, {
    type: 'GAME_READY',
    sessionId: result.session.id,
    notes: result.notes,
    bpm: song?.bpm || 120,
    duration: song?.duration || 60000,
  });

  console.log(`[WebSocket] Game started: session=${result.session.id}, song=${message.songId}, diff=${message.difficulty}`);
}

function handleNoteHitMessage(clientId: string, message: ClientMessage & { type: 'NOTE_HIT' }) {
  const client = clients.get(clientId);
  if (!client || !client.sessionId) {
    sendError(client?.ws || null, 'No active session', 400);
    return;
  }

  const result = handleNoteHit(
    client.sessionId,
    message.track,
    message.timestamp,
    message.noteId
  );

  if ('error' in result) {
    console.warn(`[WebSocket] NOTE_HIT error (${clientId}): ${result.error}`);
    sendError(client.ws, result.error, 400);
    return;
  }

  send(client.ws, result);
}

function handleGamePause(clientId: string) {
  const client = clients.get(clientId);
  if (!client || !client.sessionId) return;

  const result = handlePause(client.sessionId);
  if (!result.success) {
    sendError(client.ws, result.error || 'Pause failed', 400);
  }
}

function handleGameResume(clientId: string) {
  const client = clients.get(clientId);
  if (!client || !client.sessionId) return;

  const result = handleResume(client.sessionId);
  if (!result.success) {
    sendError(client.ws, result.error || 'Resume failed', 400);
  }
}

function handleGameQuit(clientId: string) {
  const client = clients.get(clientId);
  if (!client || !client.sessionId) return;

  const result = handleQuit(client.sessionId);
  if (result.success) {
    const gameResult = endGame(client.sessionId);
    if (gameResult) {
      const saveValidation = validateGameSave({
        songId: gameResult.songId,
        difficulty: gameResult.difficulty,
        score: gameResult.score,
        accuracy: gameResult.accuracy,
        maxCombo: gameResult.maxCombo,
        grade: gameResult.grade,
        perfectCount: gameResult.perfectCount,
        greatCount: gameResult.greatCount,
        goodCount: gameResult.goodCount,
        missCount: gameResult.missCount,
      });

      if (saveValidation.valid) {
        const saveResult = saveGameResult(client.userId, gameResult);
        send(client.ws, {
          type: 'GAME_END',
          result: gameResult,
          newHighScore: saveResult.newHighScore,
          unlockedSongs: saveResult.newUnlocks,
        });
      }
    }
    deleteSession(client.sessionId);
    client.sessionId = '';
  }
}

function handleDisconnect(clientId: string) {
  const client = clients.get(clientId);
  if (!client) return;

  console.log(`[WebSocket] Client disconnected: ${clientId}`);

  if (client.sessionId) {
    setTimeout(() => {
      const session = reconnectSession(client.sessionId);
      if (!session.success) {
        deleteSession(client.sessionId);
      }
    }, 5000);
  }

  clients.delete(clientId);
}

function send(ws: WebSocket | null, message: ServerMessage) {
  if (!ws || ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(message));
}

function sendError(ws: WebSocket | null, message: string, code: number) {
  if (!ws || ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify({
    type: 'ERROR',
    message,
    code,
  }));
}

function broadcastStateUpdates() {
  clients.forEach((client) => {
    if (!client.sessionId) return;

    const state = getStateUpdate(client.sessionId);
    if (state) {
      send(client.ws, {
        type: 'STATE_UPDATE',
        state,
      });

      if (state.status === 'ended') {
        const gameResult = endGame(client.sessionId);
        if (gameResult) {
          const saveValidation = validateGameSave({
            songId: gameResult.songId,
            difficulty: gameResult.difficulty,
            score: gameResult.score,
            accuracy: gameResult.accuracy,
            maxCombo: gameResult.maxCombo,
            grade: gameResult.grade,
            perfectCount: gameResult.perfectCount,
            greatCount: gameResult.greatCount,
            goodCount: gameResult.goodCount,
            missCount: gameResult.missCount,
          });

          if (saveValidation.valid) {
            const saveResult = saveGameResult(client.userId, gameResult);
            send(client.ws, {
              type: 'GAME_END',
              result: gameResult,
              newHighScore: saveResult.newHighScore,
              unlockedSongs: saveResult.newUnlocks,
            });
          }
        }
        deleteSession(client.sessionId);
        client.sessionId = '';
      }
    }
  });
}

function checkHeartbeats() {
  const now = Date.now();
  clients.forEach((client, clientId) => {
    if (now - client.lastHeartbeat > HEARTBEAT_TIMEOUT) {
      console.log(`[WebSocket] Client ${clientId} heartbeat timeout`);
      if (client.ws.readyState === client.ws.OPEN) {
        sendError(client.ws, 'Heartbeat timeout', 408);
      }
      handleDisconnect(clientId);
    }
  });
}

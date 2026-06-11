import app from './app.js';
import { WebSocketServer } from 'ws';
import { setupWebSocket } from './services/websocketService.js';

const PORT = process.env.PORT || 9654;

const server = app.listen(PORT, () => {
  console.log(`[Server] HTTP Server ready on port ${PORT}`);
});

const wss = new WebSocketServer({ server });
setupWebSocket(wss);
console.log(`[Server] WebSocket Server ready on port ${PORT}`);

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  wss.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  wss.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;

import 'dotenv/config';
import app from './app.js';
import { seedData } from './store/seed.js';
import { initWebSocket } from './ws/WebSocketServer.js';

const PORT = process.env.PORT || 3002;

seedData();

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Initialize WebSocket server
initWebSocket(server);

export default server;

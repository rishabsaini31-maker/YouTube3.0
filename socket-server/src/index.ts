import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupSocketHandlers } from './socketManager';

const app = express();

const FRONTEND_URLS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

app.use(cors({
  origin: FRONTEND_URLS,
  credentials: true
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Socket Server is running' });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URLS,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

setupSocketHandlers(io);

const PORT = process.env.PORT || 3004;

httpServer.listen(PORT, () => {
  console.log(`🚀 Socket Server is running on port ${PORT}`);
});

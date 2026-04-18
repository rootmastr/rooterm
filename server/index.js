import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { handleSocketConnection } from './events/socketHandler.js';
import aiController from './controllers/aiController.js';
import ragController from './controllers/ragController.js';

import authController from './controllers/authController.js';
import { protect } from './middleware/authMiddleware.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Request Logger for debugging
app.use((req, res, next) => {
  if (req.path.startsWith('/ai/')) {
    console.log(`[Backend] Received ${req.method} request to ${req.path}`);
  }
  next();
});

// Auth Routes
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', protect, authController.getMe);

// Protected Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SSH Backend Service is active.' });
});

app.post('/ai/query', protect, (req, res) => {
  aiController.handleQuery(req, res);
});

app.post('/ai/stream', protect, (req, res) => {
  aiController.handleStreamQuery(req, res);
});

app.post('/ai/suggest', protect, (req, res) => {
  aiController.handleSuggest(req, res);
});

// RAG Routes
app.post('/ai/rag/ingest', protect, (req, res) => {
  ragController.ingest(req, res);
});

app.post('/ai/rag/stream', protect, (req, res) => {
  ragController.handleQuery(req, res);
});

app.post('/ai/rag/feedback', protect, (req, res) => {
  ragController.submitFeedback(req, res);
});

app.get('/server/context/:sessionId', protect, (req, res) => {
  aiController.getContext(req, res);
});

// Socket authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Socket connection
io.on('connection', (socket) => {
  handleSocketConnection(socket);
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[Server] SSH Backend running on http://localhost:${PORT}`);
});

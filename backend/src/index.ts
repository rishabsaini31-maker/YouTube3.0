import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDb, db } from './lib/db'
import { authMiddleware } from './middleware/auth'

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Trust proxy if running behind a reverse proxy (e.g. Render)
app.set('trust proxy', 1);

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow serving images/videos cross-origin
}));

// Rate Limiting (Basic DDOS protection)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per `window`
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
});

app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json());

// Apply rate limiter to all /api routes
app.use('/api', apiLimiter);

app.use(express.static('public'));

import apiRoutes from './routes';
app.use('/api', authMiddleware, apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.listen(PORT, async () => {
  try {
    await connectDb()
  } catch (error) {
    console.error('❌ Database connection failed:', error)
  }
  console.log(`🚀 Server is running on port ${PORT}`);
});

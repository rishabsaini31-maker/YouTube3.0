process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDb, db } from './lib/db'
import { authMiddleware } from './middleware/auth'

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json());

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

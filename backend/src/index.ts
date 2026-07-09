import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './lib/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

import apiRoutes from './routes';
app.use('/api', apiRoutes);

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.listen(PORT, async () => {
  try {
    await db.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
  console.log(`🚀 Server is running on port ${PORT}`);
});

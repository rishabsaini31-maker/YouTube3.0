import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDb } from './lib/db'

app.listen(PORT, async () => {
  try {
    await connectDb()
  } catch (error) {
    console.error('❌ Database connection failed:', error)
  }
  console.log(`🚀 Server is running on port ${PORT}`)
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

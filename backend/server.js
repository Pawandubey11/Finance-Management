require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');
const connectDB  = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// ── Routes ─────────────────────────────────────────────────────
const transactionRoutes = require('./routes/transactions');
const analyticsRoutes   = require('./routes/analytics');

// ── Connect to MongoDB ─────────────────────────────────────────
connectDB();

const app = express();

// ── Global Middleware ──────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['http://localhost', 'http://frontend']
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logger (dev: coloured, prod: combined)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Health check ───────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'FinanceFlow API is running',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ─────────────────────────────────────────────────
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics',    analyticsRoutes);

// ── 404 + Error Handler ────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 FinanceFlow API  →  http://localhost:${PORT}`);
  console.log(`📋 Environment      →  ${process.env.NODE_ENV}`);
});

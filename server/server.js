require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const { startEventReminderScheduler } = require('./utils/eventReminder');
const app = express();

// Connect to MongoDB
connectDB();

// Start event reminder scheduler
startEventReminderScheduler();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/members', require('./routes/members'));
app.use('/api/officers', require('./routes/officers'));
app.use('/api/events', require('./routes/events'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/finances', require('./routes/finances'));
app.use('/api/reports', require('./routes/reports'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Server error', error: err.message });
});

// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'Organization Management API is running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access at: http://127.0.0.1:${PORT}`);
});
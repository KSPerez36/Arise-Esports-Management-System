require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');

// Strip MongoDB operators ($gt, $where, etc.) from req.body to prevent NoSQL injection
function sanitizeBody(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeBody(obj[key]);
    }
  }
}

const { startEventReminderScheduler } = require('./utils/eventReminder');
const { startDbBackupScheduler }      = require('./utils/dbScheduler');
const app = express();

// Connect to MongoDB
connectDB();

// Start schedulers
startEventReminderScheduler();
startDbBackupScheduler();

// Security middleware
app.use(helmet());
app.set('trust proxy', 1); // required for express-rate-limit behind proxies

// CORS — allow configured origins (supports both localhost and 127.0.0.1 in dev)
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.CLIENT_URL]
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, mobile apps, same-origin)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());
app.use((req, _res, next) => { sanitizeBody(req.body); next(); });

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
app.use('/api/officer-directory', require('./routes/officerDirectory'));
app.use('/api/activity-logs', require('./routes/activityLogs'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/database', require('./routes/database'));

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
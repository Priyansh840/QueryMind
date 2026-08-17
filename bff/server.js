const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const requestId = require('./middleware/request-id');
const { errorHandler } = require('./middleware/error-handler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestId);

// API Routes
app.use('/api/v1/spaces', require('./routes/spaces'));
app.use('/api/v1/objects', require('./routes/objects'));
app.use('/api/v1/search', require('./routes/search'));
app.use('/api/v1/activity', require('./routes/activity'));
app.use('/api/v1/capture', require('./routes/capture'));
app.use('/api/v1/agent', require('./routes/agent'));
app.use('/api/v1/memory', require('./routes/memory'));
app.use('/api/v1/files', require('./routes/files'));

// Serve Frontend Static Files
app.use(express.static(path.join(__dirname, '../frontend/mynd')));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/mynd', 'index.html'));
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`\n=========================================`);
  console.log(`QueryMind BFF / Integration Layer Started`);
  console.log(`=========================================`);
  console.log(`Mode: ${process.env.USE_MOCK_SERVICES !== 'false' ? 'MOCK (Independent Frontend)' : 'REAL (Connected to Services)'}`);
  console.log(`Port: ${PORT}`);
  console.log(`Frontend URL: http://localhost:${PORT}`);
  console.log(`API URL:      http://localhost:${PORT}/api/v1`);
  console.log(`=========================================\n`);
});

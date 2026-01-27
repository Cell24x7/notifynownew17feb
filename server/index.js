require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true
}));

// Routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/clients',   require('./routes/clients'));
app.use('/api/wallet',    require('./routes/wallet'));
app.use('/api/resellers', require('./routes/resellers'));
app.use('/api/plans',     require('./routes/plans'));
app.use('/api/vendors', require('./routes/vendors'));

// Root / health check
app.get('/', (req, res) => {
  res.send('Backend running 🚀');
});

// 404 - always last
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
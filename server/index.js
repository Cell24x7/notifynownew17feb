import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import rcsRoutes from './routes/rcs.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api', rcsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║    RCS Platform Backend Server         ║
║    Server running on port ${PORT}     ║
║    Database: rcs_platform             ║
║    Status: ✓ Ready                     ║
╚════════════════════════════════════════╝
  `);
});

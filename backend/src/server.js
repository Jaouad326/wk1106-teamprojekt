import express from 'express';
import cors from 'cors';
import { getDbConnection } from './config/db.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API-Vertrag: Health-Check
app.get('/api/health', async (req, res) => {
  try {
    // Teste DB-Verbindung
    const db = await getDbConnection();
    await db.get('SELECT 1');
    await db.close();

    res.status(200).json({
      data: {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'System health check failed',
        details: error.message
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend läuft auf http://localhost:${PORT}`);
});
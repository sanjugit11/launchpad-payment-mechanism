import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import router from './routes/api';
import { runSecurityScan } from './services/scanner';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Attach routes
app.use('/api', router);

// Start Server
app.listen(PORT, async () => {
  console.log(`[Server] SX Launchpad backend running on port ${PORT}`);

  // Run an initial security scan on startup to make sure reports are generated
  try {
    console.log('[Scanner] Running initial security scan...');
    await runSecurityScan();
    console.log('[Scanner] Initial security scan report generated successfully');
  } catch (err) {
    console.error('[Scanner] Failed to run initial scan:', err);
  }
});

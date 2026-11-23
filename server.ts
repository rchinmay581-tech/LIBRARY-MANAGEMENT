import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getHealthStatus,
  isDatabaseConfigured,
  listBooks,
  listStudents,
  listTransactions,
  lookupRecords,
} from './server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

function parseOptionalPositiveInt(value: unknown, fieldName: string): { value: number | null; error?: string } {
  if (value === undefined || value === null || String(value).trim() === '') {
    return { value: null };
  }
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) {
    return { value: null, error: `${fieldName} must be a positive whole number.` };
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > 2_147_483_647) {
    return { value: null, error: `${fieldName} is out of valid integer range.` };
  }
  return { value: parsed };
}

function parseOptionalBookId(value: unknown): { value: string | null; error?: string } {
  if (value === undefined || value === null || String(value).trim() === '') {
    return { value: null };
  }
  const raw = String(value).trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,32}$/.test(raw)) {
    return { value: null, error: 'Book ID must contain only letters, numbers, hyphens, or underscores (max 32 chars).' };
  }
  return { value: raw };
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get('/api/health', async (_req, res) => {
    const status = await getHealthStatus();
    res.json(status);
  });

  app.get('/api/lookup', async (req, res) => {
    if (!isDatabaseConfigured()) {
      res.status(503).json({
        error: 'Database connection is not configured. Set DATABASE_URL in Settings -> Secrets.',
        code: 'DB_NOT_CONFIGURED',
      });
      return;
    }

    const usnParsed = parseOptionalPositiveInt(req.query.usn, 'USN');
    if (usnParsed.error) {
      res.status(400).json({ error: usnParsed.error });
      return;
    }

    const bookParsed = parseOptionalBookId(req.query.bookId);
    if (bookParsed.error) {
      res.status(400).json({ error: bookParsed.error });
      return;
    }

    const txParsed = parseOptionalPositiveInt(req.query.transactionId, 'Transaction ID');
    if (txParsed.error) {
      res.status(400).json({ error: txParsed.error });
      return;
    }

    if (usnParsed.value === null && bookParsed.value === null && txParsed.value === null) {
      res.status(400).json({
        error: 'Enter at least one search identifier: USN, Book ID, or Transaction ID.',
      });
      return;
    }

    try {
      const result = await lookupRecords({
        usn: usnParsed.value,
        bookId: bookParsed.value,
        transactionId: txParsed.value,
      });
      res.json(result);
    } catch (err) {
      console.error('Lookup query failed:', err);
      res.status(500).json({
        error: 'Failed to query the PostgreSQL library databases.',
      });
    }
  });

  app.get('/api/students', async (_req, res) => {
    if (!isDatabaseConfigured()) {
      res.status(503).json({
        error: 'Database connection is not configured.',
        code: 'DB_NOT_CONFIGURED',
      });
      return;
    }
    try {
      const students = await listStudents();
      res.json({ students });
    } catch (err) {
      console.error('Students query failed:', err);
      res.status(500).json({ error: 'Failed to load students.' });
    }
  });

  app.get('/api/books', async (_req, res) => {
    if (!isDatabaseConfigured()) {
      res.status(503).json({
        error: 'Database connection is not configured.',
        code: 'DB_NOT_CONFIGURED',
      });
      return;
    }
    try {
      const books = await listBooks();
      res.json({ books });
    } catch (err) {
      console.error('Books query failed:', err);
      res.status(500).json({ error: 'Failed to load books.' });
    }
  });

  app.get('/api/transactions', async (_req, res) => {
    if (!isDatabaseConfigured()) {
      res.status(503).json({
        error: 'Database connection is not configured.',
        code: 'DB_NOT_CONFIGURED',
      });
      return;
    }
    try {
      const transactions = await listTransactions();
      res.json({ transactions });
    } catch (err) {
      console.error('Transactions query failed:', err);
      res.status(500).json({ error: 'Failed to load transactions.' });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Library Ledger server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();

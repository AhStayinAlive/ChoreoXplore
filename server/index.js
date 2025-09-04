import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { makeAIClient, AI_MODEL } from '../src/lib/aiClient.js';

// Load .env.local first if present, else fallback to .env
const rootDir = path.resolve(process.cwd());
const localEnvPath = path.join(rootDir, '.env.local');
const defaultEnvPath = path.join(rootDir, '.env');
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else if (fs.existsSync(defaultEnvPath)) {
  dotenv.config({ path: defaultEnvPath });
}

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cors());

app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], temperature = 0.7 } = req.body || {};
    const client = makeAIClient();

    const completion = await client.chat.completions.create({
      model: AI_MODEL,
      messages,
      temperature,
      stream: true,
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    for await (const chunk of completion) {
      const delta = chunk.choices?.[0]?.delta?.content ?? '';
      if (delta) res.write(delta);
    }
    res.end();
  } catch (err) {
    const message = err?.message || 'Server error';
    res.status(500).json({ error: message });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(PORT, () => {
  console.log(`Proxy running at http://localhost:${PORT}`);
});


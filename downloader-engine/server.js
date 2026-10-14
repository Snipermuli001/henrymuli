'use strict';

const express = require('express');
const cors = require('cors');
const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { isIP } = require('node:net');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '8kb' }));

const PORT = Number(process.env.PORT || 8080);
const TOKEN = process.env.ENGINE_API_TOKEN || '';
const origins = (process.env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
const allowedDomains = (process.env.ALLOWED_DOMAINS || '').split(',').map(x => x.trim().toLowerCase().replace(/^\.+|\.+$/g, '')).filter(Boolean);
const MAX_QUEUE = Math.min(20, Math.max(1, Number(process.env.MAX_QUEUE_SIZE || 8)));
const MAX_BYTES = Math.min(1024, Math.max(10, Number(process.env.MAX_DOWNLOAD_MB || 500))) * 1024 * 1024;
const TIMEOUT_MS = Math.min(1800, Math.max(60, Number(process.env.JOB_TIMEOUT_SECONDS || 900))) * 1000;
const ROOT = path.join(os.tmpdir(), 'ph-downloads');

const jobs = new Map();
const waiting = [];
let activeId = null;
let activeChild = null;

app.use(cors({
  origin(origin, cb) {
    if (!origin || origins.includes(origin)) return cb(null, true);
    return cb(new Error('Origin not allowed by downloader engine.'));
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600
}));

function authorized(req, res, next) {
  if (!TOKEN || TOKEN.length < 32) return res.status(503).json({ error: 'Engine is not configured with a strong API token.' });
  const header = req.get('authorization') || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(supplied);
  const b = Buffer.from(TOKEN);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Invalid engine token.' });
  next();
}

function validateUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error('Enter a valid URL.'); }
  if (u.protocol !== 'https:') throw new Error('Only HTTPS URLs are accepted.');
  if (u.username || u.password) throw new Error('URLs containing credentials are not accepted.');
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || isIP(host)) {
    throw new Error('This host is not allowed.');
  }
  if (!allowedDomains.length) throw new Error('The engine administrator has not configured allowed domains.');
  if (!allowedDomains.some(d => host === d || host.endsWith('.' + d))) {
    throw new Error('This website is not on the engine allowlist.');
  }
  return u.toString();
}

function publicJob(job) {
  return {
    id: job.id, status: job.status, createdAt: job.createdAt,
    startedAt: job.startedAt || null, finishedAt: job.finishedAt || null,
    filename: job.filename || null, sizeBytes: job.sizeBytes || null,
    error: job.error || null
  };
}

function safeFilename(name) {
  const cleaned = String(name || 'download').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/^\.+/, '').slice(0, 140);
  return cleaned || 'download';
}

app.get('/health', (_req, res) => res.json({ ok: true, service: 'project-henry-download-engine' }));

app.get('/api/jobs', authorized, (_req, res) => {
  res.json({ jobs: [...jobs.values()].map(publicJob).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
});

app.post('/api/jobs', authorized, async (req, res) => {
  try {
    const url = validateUrl(String(req.body?.url || ''));
    const outstanding = [...jobs.values()].filter(j => ['queued', 'running'].includes(j.status)).length;
    if (outstanding >= MAX_QUEUE) return res.status(429).json({ error: 'Engine queue is full. Try again later.' });
    const id = crypto.randomUUID();
    const job = { id, url, status: 'queued', createdAt: new Date().toISOString(), dir: path.join(ROOT, id), child: null };
    jobs.set(id, job);
    waiting.push(id);
    res.status(202).json(publicJob(job));
    void pump();
  } catch (e) {
    res.status(400).json({ error: e.message || 'Invalid request.' });
  }
});

app.get('/api/jobs/:id', authorized, (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found. Jobs are temporary and reset when the engine restarts.' });
  res.json(publicJob(job));
});

app.get('/api/jobs/:id/download', authorized, async (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found.' });
  if (job.status !== 'done' || !job.filePath) return res.status(409).json({ error: 'This download is not ready yet.' });
  try {
    const stat = await fsp.stat(job.filePath);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', 'attachment; filename="' + safeFilename(job.filename).replace(/"/g, '') + '"');
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(job.filePath);
  } catch {
    res.status(410).json({ error: 'The temporary download has expired or was removed.' });
  }
});

app.delete('/api/jobs/:id', authorized, async (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found.' });
  if (job.status === 'running' && job.child) job.child.kill('SIGTERM');
  if (job.status === 'queued') {
    job.status = 'cancelled';
    job.finishedAt = new Date().toISOString();
  }
  res.json(publicJob(job));
});

async function pump() {
  if (activeId) return;
  while (waiting.length) {
    const id = waiting.shift();
    const job = jobs.get(id);
    if (!job || job.status !== 'queued') continue;
    activeId = id;
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    try { await execute(job); }
    finally { activeId = null; activeChild = null; }
  }
}

async function execute(job) {
  let timeout;
  try {
    await fsp.mkdir(job.dir, { recursive: true });
    const args = [
      '--ignore-config', '--no-playlist', '--no-warnings', '--newline',
      '--socket-timeout', '15', '--retries', '2', '--fragment-retries', '2',
      '--max-filesize', String(MAX_BYTES), '--restrict-filenames',
      '--no-progress', '--print', 'after_move:__PH_FILE__%(filepath)s',
      '-o', path.join(job.dir, '%(title).100B.%(ext)s'),
      '--', job.url
    ];
    const child = spawn('yt-dlp', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    job.child = child;
    activeChild = child;
    let stderr = '';
    let timedOut = false;
    timeout = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, TIMEOUT_MS);
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-5000); });
    const code = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', resolve);
    });
    clearTimeout(timeout);
    if (job.status === 'cancelled') return;
    if (timedOut) throw new Error('Download timed out. Try a smaller file or a supported URL.');
    if (code !== 0) throw new Error((stderr.split('\n').filter(Boolean).slice(-2).join(' ') || 'Download engine failed.').slice(0, 300));
    const files = (await fsp.readdir(job.dir)).filter(n => !n.endsWith('.part') && !n.endsWith('.ytdl'));
    if (!files.length) throw new Error('The source did not produce a downloadable file.');
    const full = path.join(job.dir, files[0]);
    const stat = await fsp.stat(full);
    if (!stat.isFile() || stat.size > MAX_BYTES) throw new Error('The resulting file exceeds the configured size limit.');
    job.filePath = full;
    job.filename = safeFilename(files[0]);
    job.sizeBytes = stat.size;
    job.status = 'done';
    job.finishedAt = new Date().toISOString();
  } catch (e) {
    if (job.status !== 'cancelled') {
      job.status = 'failed';
      job.error = String(e.message || 'Download failed').slice(0, 300);
      job.finishedAt = new Date().toISOString();
    }
  } finally {
    clearTimeout(timeout);
    job.child = null;
  }
}

async function cleanup() {
  try { await fsp.mkdir(ROOT, { recursive: true }); } catch {}
  setInterval(async () => {
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [id, job] of jobs) {
      const t = Date.parse(job.finishedAt || job.createdAt);
      if (t < cutoff && job.status !== 'running') {
        jobs.delete(id);
        try { await fsp.rm(job.dir, { recursive: true, force: true }); } catch {}
      }
    }
  }, 5 * 60 * 1000).unref();
}
cleanup();

app.use((err, _req, res, _next) => {
  if (err && err.message === 'Origin not allowed by downloader engine.') return res.status(403).json({ error: err.message });
  res.status(500).json({ error: 'Unexpected engine error.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Project Henry download engine listening on port ' + PORT);
});

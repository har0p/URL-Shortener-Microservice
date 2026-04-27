const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dns = require('dns');
const url = require('url');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── In-memory "database" (no DB needed) ─────────────────────
// Format: { shortCode: originalUrl }
const urlDatabase = {};
let counter = 1;

// ─── Helper: validate URL format ─────────────────────────────
function isValidUrl(inputUrl) {
  try {
    const parsed = new URL(inputUrl);
    // harus http atau https
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// ─── Routes ──────────────────────────────────────────────────

// Halaman utama
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// POST /api/shorturl — buat short URL
app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;

  // 1. Validasi format URL
  if (!isValidUrl(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }

  // 2. Ambil hostname untuk dns.lookup
  const hostname = new URL(originalUrl).hostname;

  // 3. Verifikasi hostname pakai dns.lookup
  dns.lookup(hostname, (err) => {
    if (err) {
      return res.json({ error: 'invalid url' });
    }

    // 4. Cek apakah URL sudah ada di database (biar gak duplikat)
    const existing = Object.entries(urlDatabase).find(
      ([, val]) => val === originalUrl
    );

    if (existing) {
      return res.json({
        original_url: originalUrl,
        short_url: Number(existing[0]),
      });
    }

    // 5. Simpan URL baru
    const shortCode = counter++;
    urlDatabase[shortCode] = originalUrl;

    return res.json({
      original_url: originalUrl,
      short_url: shortCode,
    });
  });
});

// GET /api/shorturl/:short_url — redirect ke URL asli
app.get('/api/shorturl/:short_url', (req, res) => {
  const shortCode = req.params.short_url;
  const originalUrl = urlDatabase[shortCode];

  if (!originalUrl) {
    return res.json({ error: 'No short URL found for the given input' });
  }

  res.redirect(originalUrl);
});

// ─── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

module.exports = app;
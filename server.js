import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Configuração de caminhos (ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 80; // Rodar na porta 80 para facilitar o acesso na web

// Middlewares
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do Frontend (React Build)
app.use(express.static(path.join(__dirname, 'dist')));

// --- BANCO DE DADOS (SQLite) ---
const db = new sqlite3.Database('./grapaz.db', (err) => {
  if (err) console.error('Erro ao abrir banco de dados', err);
  else console.log('Banco de dados conectado/criado: grapaz.db');
});

// Criar tabelas se não existirem
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS bids (
    id TEXT PRIMARY KEY,
    orgao TEXT,
    cidade TEXT,
    plataforma TEXT,
    numeroPregao TEXT,
    processo TEXT,
    data TEXT,
    horario TEXT,
    modalidade TEXT,
    status TEXT,
    value REAL,
    items TEXT,
    deadlines TEXT, 
    paymentDeadline TEXT,
    isPaid INTEGER
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    originalName TEXT,
    type TEXT,
    createdAt TEXT
  )`);
});

// --- UPLOAD DE ARQUIVOS (Multer) ---
// Pasta onde os arquivos ficarão na VPS
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// --- API ENDPOINTS ---

// 1. Listar Pregões
app.get('/api/bids', (req, res) => {
  db.all("SELECT * FROM bids", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // Parse JSON strings de volta para objetos
    const parsedRows = rows.map(r => ({
      ...r,
      deadlines: JSON.parse(r.deadlines || '{}'),
      isPaid: !!r.isPaid
    }));
    res.json(parsedRows);
  });
});

// 2. Criar Pregão
app.post('/api/bids', (req, res) => {
  const bid = req.body;
  const stmt = db.prepare(`INSERT INTO bids VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  stmt.run(
    bid.id, bid.orgao, bid.cidade, bid.plataforma, bid.numeroPregao, bid.processo, 
    bid.data, bid.horario, bid.modalidade, bid.status, bid.value, bid.items, 
    JSON.stringify(bid.deadlines), bid.paymentDeadline, bid.isPaid ? 1 : 0,
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json(bid);
    }
  );
  stmt.finalize();
});

// 3. Atualizar Pregão
app.put('/api/bids/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Construção dinâmica da query
  const fields = Object.keys(updates).filter(k => k !== 'id').map(k => {
    if (k === 'deadlines') return `deadlines = ?`;
    if (k === 'isPaid') return `isPaid = ?`;
    return `${k} = ?`;
  });
  
  const values = Object.keys(updates).filter(k => k !== 'id').map(k => {
    if (k === 'deadlines') return JSON.stringify(updates[k]);
    if (k === 'isPaid') return updates[k] ? 1 : 0;
    return updates[k];
  });
  
  const query = `UPDATE bids SET ${fields.join(', ')} WHERE id = ?`;
  
  db.run(query, [...values, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 4. Upload de Arquivo
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('Nenhum arquivo enviado.');
  
  const { type } = req.body; // 'entry' ou 'exit'
  db.run(`INSERT INTO files (filename, originalName, type, createdAt) VALUES (?, ?, ?, ?)`, 
    [req.file.filename, req.file.originalname, type, new Date().toISOString()],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, filename: req.file.filename });
    }
  );
});

// 5. Listar Arquivos
app.get('/api/files', (req, res) => {
  db.all("SELECT * FROM files ORDER BY createdAt DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 6. Download Arquivo
app.get('/api/download/:filename', (req, res) => {
  const filepath = path.join(uploadDir, req.params.filename);
  res.download(filepath); // Envia o arquivo para download
});

// Redirecionar qualquer outra rota para o React (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
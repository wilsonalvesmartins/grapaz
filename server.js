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
const dbPath = path.join(__dirname, 'grapaz.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Erro ao abrir banco de dados no Painel:', err);
  else console.log('Banco de dados conectado no Painel: ' + dbPath);
});

// Criar tabelas e Migrações (Correção para dados sumindo)
db.serialize(() => {
  // 1. Tabela de Pregões
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

  // 2. Tabela de Arquivos
  db.run(`CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    originalName TEXT,
    type TEXT,
    createdAt TEXT
  )`);

  // 3. Verificação e Migração de Colunas (Se a coluna plataforma não existir, cria ela)
  db.all("PRAGMA table_info(bids)", (err, rows) => {
    if (!err && rows) {
      const hasPlataforma = rows.some(r => r.name === 'plataforma');
      if (!hasPlataforma) {
        console.log("Migrando banco de dados: Adicionando coluna 'plataforma'...");
        db.run("ALTER TABLE bids ADD COLUMN plataforma TEXT", (err) => {
          if (err) console.error("Erro na migração:", err);
          else console.log("Coluna 'plataforma' adicionada com sucesso.");
        });
      }
    }
  });
});

// --- UPLOAD DE ARQUIVOS (Multer) ---
// Pasta onde os arquivos ficarão no Painel
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    console.log("Criando pasta de uploads no Painel...");
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// --- API ENDPOINTS ---

// 1. Listar Pregões
app.get('/api/bids', (req, res) => {
  db.all("SELECT * FROM bids", [], (err, rows) => {
    if (err) {
      console.error("Erro ao buscar pregões:", err);
      return res.status(500).json({ error: err.message });
    }
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
  
  // Garante que todos os campos existam para evitar erro de SQL
  const params = [
    bid.id, bid.orgao, bid.cidade, bid.plataforma || '', bid.numeroPregao, bid.processo, 
    bid.data, bid.horario, bid.modalidade, bid.status, bid.value || 0, bid.items || '', 
    JSON.stringify(bid.deadlines || {}), bid.paymentDeadline || '', bid.isPaid ? 1 : 0
  ];

  const stmt = db.prepare(`INSERT INTO bids (
    id, orgao, cidade, plataforma, numeroPregao, processo, data, horario, 
    modalidade, status, value, items, deadlines, paymentDeadline, isPaid
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  
  stmt.run(params, function(err) {
    if (err) {
      console.error("Erro ao salvar pregão no Painel:", err);
      return res.status(500).json({ error: "Erro ao salvar no banco: " + err.message });
    }
    res.json(bid);
  });
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
  
  if (fields.length === 0) return res.json({ success: true }); // Nada a atualizar

  const query = `UPDATE bids SET ${fields.join(', ')} WHERE id = ?`;
  
  db.run(query, [...values, id], function(err) {
    if (err) {
      console.error("Erro ao atualizar pregão:", err);
      return res.status(500).json({ error: err.message });
    }
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
      if (err) {
        console.error("Erro ao salvar metadados do arquivo no banco:", err);
        return res.status(500).json({ error: err.message });
      }
      console.log(`Arquivo salvo no Painel: ${req.file.filename}`);
      res.json({ success: true, filename: req.file.filename });
    }
  );
});

// 5. Listar Arquivos
app.get('/api/files', (req, res) => {
  db.all("SELECT * FROM files ORDER BY createdAt DESC", [], (err, rows) => {
    if (err) {
      console.error("Erro ao listar arquivos:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 6. Download Arquivo
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  // Segurança básica para evitar path traversal
  const safeFilename = path.basename(filename);
  const filepath = path.join(uploadDir, safeFilename);
  
  if (fs.existsSync(filepath)) {
      res.download(filepath);
  } else {
      res.status(404).send("Arquivo não encontrado no Painel.");
  }
});

// Redirecionar qualquer outra rota para o React (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor Painel rodando na porta ${PORT}`);
});

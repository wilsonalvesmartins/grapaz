import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// --- CONFIGURAÇÕES DO AMBIENTE ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 80;

// IMPORTANTE: Define a pasta onde os dados reais vão ficar
// No Dockerfile, definimos isso como VOLUME para não perder dados
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'grapaz.db');

// Garante que as pastas existem ao iniciar
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

console.log(`[Painel] Iniciando...`);
console.log(`[Painel] Banco de Dados: ${DB_PATH}`);
console.log(`[Painel] Pasta de Uploads: ${UPLOAD_DIR}`);

// Middlewares
app.use(cors());
app.use(express.json());
// Serve o site (React)
app.use(express.static(path.join(__dirname, 'dist')));

// --- BANCO DE DADOS ---
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('[Painel] ERRO CRÍTICO ao abrir banco:', err.message);
  } else {
    console.log('[Painel] Banco conectado com sucesso.');
  }
});

// Inicialização das Tabelas
db.serialize(() => {
  // Tabela Bids
  db.run(`CREATE TABLE IF NOT EXISTS bids (
    id TEXT PRIMARY KEY,
    orgao TEXT, cidade TEXT, plataforma TEXT, numeroPregao TEXT, processo TEXT,
    data TEXT, horario TEXT, modalidade TEXT, status TEXT, value REAL,
    items TEXT, deadlines TEXT, paymentDeadline TEXT, isPaid INTEGER
  )`);

  // Tabela Files
  db.run(`CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT, originalName TEXT, type TEXT, createdAt TEXT
  )`);

  // Migração de Segurança: Garante que a coluna plataforma existe
  db.all("PRAGMA table_info(bids)", (err, rows) => {
    if (!err && rows) {
      const hasPlataforma = rows.some(r => r.name === 'plataforma');
      if (!hasPlataforma) {
        console.log("[Painel] Atualizando banco antigo: Criando coluna plataforma...");
        db.run("ALTER TABLE bids ADD COLUMN plataforma TEXT", (e) => {
          if (e) console.error("Erro na migração:", e);
        });
      }
    }
  });
});

// --- CONFIGURAÇÃO DE UPLOAD ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Remove caracteres especiais do nome do arquivo para evitar erros no Linux
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${Date.now()}-${cleanName}`);
  }
});
const upload = multer({ storage });

// --- ROTAS DA API ---

// 1. Listar Pregões
app.get('/api/bids', (req, res) => {
  db.all("SELECT * FROM bids", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const parsed = rows.map(r => ({
      ...r,
      deadlines: JSON.parse(r.deadlines || '{}'),
      isPaid: !!r.isPaid
    }));
    res.json(parsed);
  });
});

// 2. Salvar Pregão
app.post('/api/bids', (req, res) => {
  const bid = req.body;
  console.log(`[Painel] Tentando salvar pregão: ${bid.orgao}`);

  const stmt = db.prepare(`INSERT OR REPLACE INTO bids (
    id, orgao, cidade, plataforma, numeroPregao, processo, data, horario, 
    modalidade, status, value, items, deadlines, paymentDeadline, isPaid
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const params = [
    bid.id, bid.orgao, bid.cidade, bid.plataforma || '', bid.numeroPregao, bid.processo,
    bid.data, bid.horario, bid.modalidade, bid.status, bid.value || 0, bid.items || '',
    JSON.stringify(bid.deadlines || {}), bid.paymentDeadline || '', bid.isPaid ? 1 : 0
  ];

  stmt.run(params, function(err) {
    if (err) {
      console.error("[Painel] Erro ao salvar no banco:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`[Painel] Pregão salvo com sucesso. ID: ${bid.id}`);
    res.json(bid);
  });
  stmt.finalize();
});

// 3. Atualizar
app.put('/api/bids/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Lógica simples de atualização
  const fields = [], values = [];
  Object.keys(updates).forEach(key => {
    if (key === 'id') return;
    fields.push(`${key} = ?`);
    if (key === 'deadlines') values.push(JSON.stringify(updates[key]));
    else if (key === 'isPaid') values.push(updates[key] ? 1 : 0);
    else values.push(updates[key]);
  });

  if (fields.length === 0) return res.json({ success: true });

  const query = `UPDATE bids SET ${fields.join(', ')} WHERE id = ?`;
  db.run(query, [...values, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 4. Deletar Pregão
app.delete('/api/bids/:id', (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM bids WHERE id = ?", id, function(err) {
    if (err) {
      console.error("[Painel] Erro ao deletar pregão:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// 5. Upload de Arquivo
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('Arquivo não recebido.');
  
  const { type } = req.body;
  console.log(`[Painel] Arquivo recebido: ${req.file.filename}`);

  db.run(`INSERT INTO files (filename, originalName, type, createdAt) VALUES (?, ?, ?, ?)`, 
    [req.file.filename, req.file.originalname, type, new Date().toISOString()],
    (err) => {
      if (err) {
        console.error("[Painel] Erro ao salvar registro do arquivo:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, filename: req.file.filename });
    }
  );
});

// 6. Listar Arquivos
app.get('/api/files', (req, res) => {
  db.all("SELECT * FROM files ORDER BY createdAt DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 7. Deletar Arquivo
app.delete('/api/files/:id', (req, res) => {
  const { id } = req.params;
  db.get("SELECT filename FROM files WHERE id = ?", id, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Arquivo não encontrado" });

    const filepath = path.join(UPLOAD_DIR, row.filename);
    
    // Deleta do banco primeiro
    db.run("DELETE FROM files WHERE id = ?", id, (dbErr) => {
      if (dbErr) return res.status(500).json({ error: dbErr.message });
      
      // Tenta deletar do disco (opcional, não falha se não conseguir)
      try {
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      } catch (fsErr) {
        console.error("[Painel] Erro ao deletar arquivo do disco:", fsErr);
      }
      
      console.log(`[Painel] Arquivo deletado: ${row.filename}`);
      res.json({ success: true });
    });
  });
});

// 8. Download
app.get('/api/download/:filename', (req, res) => {
  const filepath = path.join(UPLOAD_DIR, req.params.filename);
  if (fs.existsSync(filepath)) {
    res.download(filepath);
  } else {
    res.status(404).send("Arquivo não encontrado no disco do Painel.");
  }
});

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[Painel] Servidor rodando na porta ${PORT}`);
});

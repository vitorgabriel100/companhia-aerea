const express = require('express');
const { db } = require('../models/database');
const router = express.Router();

// Importação correta do banco de dados
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// **CAMINHO CORRETO - mesmo usado no reset-db.js**
const dbPath = path.join(__dirname, '..', 'database.sqlite'); // Correto!
console.log('📁 Caminho do banco:', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar com banco de dados:', err.message);
    } else {
        console.log('✅ Conectado ao banco de dados SQLite');
        
        // Inserir voos de exemplo automaticamente
        inserirVoosExemplo();
    }
});

// Função para inserir voos de exemplo
function inserirVoosExemplo() {
    console.log('🔄 Verificando se precisa inserir voos de exemplo...');
    
    // Verificar se já existem voos
    db.get("SELECT COUNT(*) as count FROM voos", (err, result) => {
        if (err) {
            console.error('❌ Erro ao verificar voos:', err);
            return;
        }
        
        if (result.count === 0) {
            console.log('📥 Inserindo voos de exemplo...');
            
            const voosExemplo = [
                {
                    codigo: 'VG1001',
                    origem: 'São Paulo (GRU)',
                    destino: 'Rio de Janeiro (GIG)',
                    data_partida: '2024-12-20',
                    hora_partida: '08:00',
                    data_chegada: '2024-12-20',
                    hora_chegada: '09:30',
                    aeronave_id: 1,
                    preco_base: 299.90,
                    assentos_disponiveis: 186,
                    status: 'agendado'
                },
                {
                    codigo: 'VG1002',
                    origem: 'Rio de Janeiro (GIG)',
                    destino: 'Brasília (BSB)',
                    data_partida: '2024-12-20',
                    hora_partida: '10:00',
                    data_chegada: '2024-12-20',
                    hora_chegada: '12:00',
                    aeronave_id: 2,
                    preco_base: 399.90,
                    assentos_disponiveis: 180,
                    status: 'agendado'
                },
                {
                    codigo: 'VG1003',
                    origem: 'São Paulo (GRU)',
                    destino: 'Salvador (SSA)',
                    data_partida: '2024-12-20',
                    hora_partida: '14:00',
                    data_chegada: '2024-12-20',
                    hora_chegada: '16:30',
                    aeronave_id: 3,
                    preco_base: 499.90,
                    assentos_disponiveis: 124,
                    status: 'agendado'
                }
            ];

            const insertQuery = `
                INSERT INTO voos (codigo, origem, destino, data_partida, hora_partida, data_chegada, hora_chegada, aeronave_id, preco_base, assentos_disponiveis, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            voosExemplo.forEach((voo, index) => {
                db.run(insertQuery, [
                    voo.codigo, voo.origem, voo.destino, 
                    voo.data_partida, voo.hora_partida, 
                    voo.data_chegada, voo.hora_chegada,
                    voo.aeronave_id, voo.preco_base, 
                    voo.assentos_disponiveis, voo.status
                ], function(err) {
                    if (err) {
                        console.error(`❌ Erro ao inserir voo ${voo.codigo}:`, err);
                    } else {
                        console.log(`✅ Voo ${voo.codigo} inserido (ID: ${this.lastID})`);
                    }
                });
            });
        } else {
            console.log(`✅ Já existem ${result.count} voos no banco`);
        }
    });
}

// =========================================
// ROTAS GERAIS (TABELA VOOS)
// =========================================

// Rota para listar todos os voos gerais (Status 'agendado')
router.get('/', (req, res) => {
  console.log('📡 Recebida requisição para buscar voos...');
  
  const query = `
    SELECT v.*, 
           a.modelo as aeronave_modelo,
           a.codigo as aeronave_codigo
    FROM voos v
    LEFT JOIN aeronaves a ON v.aeronave_id = a.id
    WHERE v.status = 'agendado'
    ORDER BY v.data_partida, v.hora_partida
  `;
  
  console.log('🔍 Executando query de voos...');
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('❌ Erro ao buscar voos:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor.',
        error: err.message 
      });
    }
    
    console.log(`✅ ${rows.length} voos encontrados`);
    
    res.json({ 
      success: true, 
      voos: rows,
      total: rows.length 
    });
  });
});

// Rota SIMPLES para testar - busca TODOS os voos
router.get('/teste', (req, res) => {
  console.log('🧪 Rota de teste chamada');
  
  const query = "SELECT * FROM voos ORDER BY data_partida, hora_partida";
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('❌ Erro na rota de teste:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro no teste',
        error: err.message 
      });
    }
    
    console.log(`🧪 ${rows.length} voos na rota de teste`);
    res.json({ 
      success: true, 
      voos: rows,
      message: 'Rota de teste funcionando' 
    });
  });
});

// Rota para verificar todas as tabelas e contagens
router.get('/debug/tabelas', (req, res) => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const tabelasInfo = [];
    let tabelasProcessadas = 0;
    
    if (tables.length === 0) {
      return res.json({ tabelas: [] });
    }
    
    tables.forEach((table) => {
      db.all(`SELECT COUNT(*) as count FROM ${table.name}`, (err, countResult) => {
        if (err) {
          tabelasInfo.push({ nome: table.name, erro: err.message });
        } else {
          tabelasInfo.push({ 
            nome: table.name, 
            registros: countResult[0].count 
          });
        }
        
        tabelasProcessadas++;
        
        // Quando todas as tabelas forem processadas, enviar resposta
        if (tabelasProcessadas === tables.length) {
          res.json({ 
            success: true,
            tabelas: tabelasInfo 
          });
        }
      });
    });
  });
});

module.exports = router;
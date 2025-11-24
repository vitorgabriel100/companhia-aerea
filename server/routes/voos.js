const express = require('express');
const { db } = require('../models/database'); // Usa a mesma conexão
const router = express.Router();

// =========================================
// ROTAS GERAIS (TABELA VOOS)
// =========================================

// Rota para listar todos os voos gerais (Status 'agendado')
router.get('/', (req, res) => {
  console.log('Recebida requisição para buscar voos...');
  
  const query = `
    SELECT v.*, 
           a.modelo as aeronave_modelo,
           a.codigo as aeronave_codigo
    FROM voos v
    LEFT JOIN aeronaves a ON v.aeronave_id = a.id
    WHERE v.status = 'agendado'
    ORDER BY v.data_partida, v.hora_partida
  `;
  
  console.log('Executando query de voos...');
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar voos:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor.',
        error: err.message 
      });
    }
    
    console.log(`${rows.length} voos encontrados`);
    
    res.json({ 
      success: true, 
      voos: rows,
      total: rows.length 
    });
  });
});

// Rota para buscar detalhes de um voo específico - **CRÍTICA: ESTAVA FALTANDO**
router.get('/:id', (req, res) => {
  const { id } = req.params;
  console.log(`Buscando voo ID: ${id}`);
  
  const query = `
    SELECT v.*, 
           a.modelo as aeronave_modelo,
           a.codigo as aeronave_codigo
    FROM voos v
    LEFT JOIN aeronaves a ON v.aeronave_id = a.id
    WHERE v.id = ?
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Erro ao buscar voo:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor.' 
      });
    }
    
    if (!row) {
      console.log(`Voo ${id} não encontrado`);
      return res.status(404).json({ 
        success: false, 
        message: 'Voo não encontrado' 
      });
    }
    
    console.log(`Voo encontrado: ${row.codigo}`);
    res.json({ 
      success: true, 
      voo: row 
    });
  });
});

// Rota SIMPLES para testar - busca TODOS os voos
router.get('/teste', (req, res) => {
  console.log('Rota de teste chamada');
  
  const query = "SELECT * FROM voos ORDER BY data_partida, hora_partida";
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Erro na rota de teste:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro no teste',
        error: err.message 
      });
    }
    
    console.log(`${rows.length} voos na rota de teste`);
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

// =========================================
// ROTAS DE ATRIBUIÇÃO (PAINEL DO DIRETOR)
// =========================================

// Rota para ATRIBUIR um voo a um piloto (Grava na nova tabela voos_atribuidos)
router.post('/atribuir', (req, res) => {
    const { piloto_id, numero_voo, origem, destino, data_partida, horario_partida } = req.body;

    // Validação básica
    if (!piloto_id || !numero_voo || !origem || !destino || !data_partida || !horario_partida) {
        return res.status(400).json({ 
            success: false, 
            message: "Todos os campos são obrigatórios para atribuição." 
        });
    }

    const sql = `
        INSERT INTO voos_atribuidos (piloto_id, numero_voo, origem, destino, data_partida, horario_partida, status) 
        VALUES (?, ?, ?, ?, ?, ?, 'Agendado')
    `;
    
    db.run(sql, [piloto_id, numero_voo, origem, destino, data_partida, horario_partida], function(err) {
        if (err) {
            console.error('Erro ao atribuir voo:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        
        console.log(`Voo ${numero_voo} atribuído ao piloto ID ${piloto_id}`);
        res.json({ 
            success: true, 
            id: this.lastID, 
            message: "Voo atribuído com sucesso ao piloto!" 
        });
    });
});

// =========================================
// ROTAS DO PILOTO (PAINEL DO PILOTO)
// =========================================

// Rota para buscar voos ATRIBUÍDOS a um piloto específico
router.get('/piloto/:id', (req, res) => {
  const { id } = req.params;
  
  // Busca na nova tabela voos_atribuidos
  const query = `
    SELECT * FROM voos_atribuidos 
    WHERE piloto_id = ? 
    ORDER BY data_partida ASC, horario_partida ASC
  `;
  
  db.all(query, [id], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar voos atribuídos:', err);
      return res.status(500).json({ success: false, message: 'Erro ao buscar escala.' });
    }

    // Separação lógica para o Frontend
    const voosAgendados = rows.filter(v => v.status === 'Agendado');
    const logDeVoos = rows.filter(v => v.status === 'Concluido' || v.status === 'Cancelado');
    
    console.log(`Piloto ${id} consultou escala: ${voosAgendados.length} voos encontrados.`);

    res.json({
        success: true,
        voosAgendados: voosAgendados,
        logDeVoos: logDeVoos
    });
  });
});

// Rota para o piloto alterar status (ex: Iniciar/Concluir voo)
router.put('/status/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // Ex: 'Em Rota', 'Concluido'

    const sql = `UPDATE voos_atribuidos SET status = ? WHERE id = ?`;
    
    db.run(sql, [status, id], function(err) {
        if (err) {
            console.error('Erro ao atualizar status:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, message: "Status do voo atualizado." });
    });
});

module.exports = router;
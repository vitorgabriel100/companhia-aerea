const express = require('express');
const db = require('../models/database'); // Ajustado para importação padrão do SQLite
const router = express.Router();

// =========================================
// ROTAS GERAIS (TABELA VOOS)
// =========================================

// Rota para listar todos os voos gerais (Status 'agendado')
router.get('/', (req, res) => {
  const query = `
    SELECT v.*, 
           a.modelo as aeronave_modelo,
           p.nome as piloto_nome,
           cp.nome as co_piloto_nome
    FROM voos v
    LEFT JOIN aeronaves a ON v.aeronave_id = a.id
    LEFT JOIN usuarios p ON v.piloto_id = p.id
    LEFT JOIN usuarios cp ON v.co_piloto_id = cp.id
    WHERE v.status = 'agendado'
    ORDER BY v.data_partida, v.hora_partida
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('❌ Erro ao buscar voos:', err);
      return res.status(500).json({ success: false, message: 'Erro interno.' });
    }
    res.json({ success: true, voos: rows });
  });
});

// Rota para buscar detalhes de um voo específico
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT v.*, 
           a.modelo as aeronave_modelo,
           p.nome as piloto_nome,
           cp.nome as co_piloto_nome
    FROM voos v
    LEFT JOIN aeronaves a ON v.aeronave_id = a.id
    LEFT JOIN usuarios p ON v.piloto_id = p.id
    LEFT JOIN usuarios cp ON v.co_piloto_id = cp.id
    WHERE v.id = ?
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: 'Voo não encontrado' });
    
    res.json({ success: true, voo: row });
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
            console.error('❌ Erro ao atribuir voo:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        
        console.log(`✅ Voo ${numero_voo} atribuído ao piloto ID ${piloto_id}`);
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
      console.error('❌ Erro ao buscar voos atribuídos:', err);
      return res.status(500).json({ success: false, message: 'Erro ao buscar escala.' });
    }

    // Separação lógica para o Frontend
    const voosAgendados = rows.filter(v => v.status === 'Agendado');
    const logDeVoos = rows.filter(v => v.status === 'Concluido' || v.status === 'Cancelado');
    
    console.log(`🔎 Piloto ${id} consultou escala: ${voosAgendados.length} voos encontrados.`);

    res.json({
        success: true,
        voosAgendados: voosAgendados,
        logDeVoos: logDeVoos
    });
  });
});

// Rota para o piloto alterar status (ex: Iniciar/Concluir voo) - Opcional Futuro
router.put('/status/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // Ex: 'Em Rota', 'Concluido'

    const sql = `UPDATE voos_atribuidos SET status = ? WHERE id = ?`;
    
    db.run(sql, [status, id], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: "Status do voo atualizado." });
    });
});

module.exports = router;
const express = require('express');
const { db } = require('../models/database'); // Importação CORRETA
const router = express.Router();

// Rota para listar todos os voos
router.get('/', (req, res) => {
  // const db = getDatabase(); // <-- Esta linha precisa ser REMOVIDA
  
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
  
  db.all(query, [], (err, rows) => { // 'db' da linha 2 é usado aqui
    if (err) {
      console.error('❌ Erro ao buscar voos:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
    
    console.log(`✅ ${rows.length} voos encontrados`);
    res.json(rows); // O frontend espera um array direto
  });
});

// Rota para buscar voo por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  // const db = getDatabase(); // <-- Esta linha precisa ser REMOVIDA
  
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
  
  db.get(query, [id], (err, row) => { // 'db' da linha 2 é usado aqui
    if (err) {
      console.error('❌ Erro ao buscar voo:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
    
    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Voo não encontrado'
      });
    }
    
    // A página do cliente espera o voo dentro de um objeto
    res.json({
        success: true,
        voo: row
    });
  });
});

// ==========================================================
// ✅ ROTA ADICIONADA
// ==========================================================
// ROTA: PUT /api/voos/:id/atribuir-pilotos
// Atualiza o piloto_id e co_piloto_id de um voo
router.put('/:id/atribuir-pilotos', (req, res) => {
    // (Idealmente, proteja esta rota para que apenas 'diretores' possam acessar)
    const vooId = req.params.id;
    const { pilotoId, coPilotoId } = req.body;

    // Validação simples
    if (pilotoId && pilotoId !== "0" && pilotoId === coPilotoId) {
        return res.status(400).json({ success: false, message: 'Piloto e Co-piloto não podem ser a mesma pessoa.' });
    }

    const sql = `
        UPDATE voos 
        SET 
            piloto_id = ?, 
            co_piloto_id = ? 
        WHERE id = ?
    `;

    // Usamos null se o ID for '0' ou indefinido
    const pId = (pilotoId && pilotoId !== "0") ? pilotoId : null;
    const cpId = (coPilotoId && coPilotoId !== "0") ? coPilotoId : null;

    db.run(sql, [pId, cpId, vooId], function(err) {
        if (err) {
            console.error('Erro ao atualizar voo:', err);
            return res.status(500).json({ success: false, message: 'Erro ao atualizar voo.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Voo não encontrado.' });
        }
        res.json({ success: true, message: 'Pilotos atribuídos com sucesso!' });
    });
});

module.exports = router;
const express = require('express');
const { db } = require('../models/database'); // <-- CORRIGIDO
const router = express.Router();

// Rota para dados do dashboard/demonstrativo
router.get('/', (req, res) => {
  // const db = getDatabase(); // <-- CORRIGIDO (removido)
  
  const queries = {
    totalUsuarios: "SELECT COUNT(*) as total FROM usuarios",
    totalVoos: "SELECT COUNT(*) as total FROM voos",
    totalPassagens: "SELECT COUNT(*) as total FROM passagens",
    receitaTotal: "SELECT SUM(preco_final) as total FROM passagens",
    voosPorStatus: "SELECT status, COUNT(*) as total FROM voos GROUP BY status",
    usuariosPorTipo: "SELECT tipo, COUNT(*) as total FROM usuarios GROUP BY tipo",
    aeronavesAtivas: "SELECT COUNT(*) as total FROM aeronaves WHERE status = 'disponivel'"
  };

  const results = {};
  let completed = 0;
  const totalQueries = Object.keys(queries).length;

  Object.keys(queries).forEach(key => {
    db.get(queries[key], (err, row) => { // 'db' da linha 2 funciona aqui
      if (err) {
        console.error(`❌ Erro na query ${key}:`, err);
        results[key] = { error: 'Erro ao buscar dados' };
      } else {
        results[key] = row;
      }
      
      completed++;
      
      if (completed === totalQueries) {
        res.json({
          success: true,
          data: results
        });
      }
    });
  });
});

module.exports = router;
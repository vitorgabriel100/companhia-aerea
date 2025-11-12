const express = require('express');
const router = express.Router();
const { db } = require('../models/database');

// ==========================================================
// ROTA PRINCIPAL DO PILOTO: GET /api/piloto/meus-voos
// ==========================================================
// Esta rota busca todos os voos associados a um piloto.
//
// IMPORTANTE: Esta rota DEVE ser protegida!
// Você precisa de um middleware de autenticação (ex: authMiddleware)
// que verifique o token/sessão e coloque os dados do usuário em `req.user`.
//
// Por enquanto, estou simulando o ID do piloto (req.user.id)
// com o valor '5' (Paulo Piloto do seu reset-db.js).
// Você DEVE substituir '5' pela lógica de usuário logado.
// ==========================================================
router.get('/meus-voos', (req, res) => {
    // LÓGICA DE AUTENTICAÇÃO (SUBSTITUIR)
    // const pilotoLogadoId = req.user.id; // <- O JEITO CORRETO (usando middleware)
    const pilotoLogadoId = 14; // <- SIMULAÇÃO TEMPORÁRIA (Paulo Piloto)

    if (!pilotoLogadoId) {
        return res.status(401).json({ success: false, message: 'Não autorizado. ID do piloto não encontrado.' });
    }

    const sql = `
        SELECT 
            v.id, v.codigo, v.origem, v.destino, 
            v.data_partida, v.hora_partida,
            v.status,
            a.modelo as aeronave_modelo,
            (SELECT nome FROM usuarios WHERE id = v.piloto_id) as piloto_nome,
            (SELECT nome FROM usuarios WHERE id = v.co_piloto_id) as co_piloto_nome
        FROM voos v
        JOIN aeronaves a ON v.aeronave_id = a.id
        WHERE v.piloto_id = ? OR v.co_piloto_id = ?
        ORDER BY v.data_partida, v.hora_partida
    `;

    db.all(sql, [pilotoLogadoId, pilotoLogadoId], (err, voos) => {
        if (err) {
            console.error('Erro ao buscar voos do piloto:', err);
            return res.status(500).json({ success: false, message: 'Erro de servidor ao buscar voos.' });
        }
        res.json({ success: true, voos: voos });
    });
});

module.exports = router;
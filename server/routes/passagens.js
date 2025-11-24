const express = require('express');
const { db } = require('../models/database');
const router = express.Router();

// Middleware de log
const log = (mensagem) => {
    console.log(mensagem);
};

// Rota para obter formas de pagamento disponíveis
router.get('/formas-pagamento', (req, res) => {
    log('Buscando formas de pagamento disponíveis');

    db.all(`
        SELECT id, nome, parcelas_maximas 
        FROM formas_pagamento 
        WHERE ativo = 1
        ORDER BY id
    `, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar formas de pagamento:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }

        log(`Formas de pagamento encontradas: ${rows.length}`);
        
        res.json({
            success: true,
            formasPagamento: rows
        });
    });
});

// Comprar passagem (CORRIGIDA para funcionar com o frontend)
router.post('/comprar', (req, res) => {
    const { voo_id, usuario_id, formaPagamento, parcelas = 1, preco_final } = req.body;

    console.log('Tentativa de compra de passagem:', { 
        voo_id, 
        usuario_id, 
        formaPagamento, 
        parcelas,
        preco_final
    });

    // Validações básicas
    if (!voo_id || !usuario_id || !formaPagamento || !preco_final) {
        return res.status(400).json({
            success: false,
            message: 'Voo, usuário, forma de pagamento e preço são obrigatórios'
        });
    }

    // Primeiro, verificar forma de pagamento válida
    db.get("SELECT * FROM formas_pagamento WHERE nome = ? AND ativo = 1", [formaPagamento], (err, formaPagamentoValida) => {
        if (err) {
            console.error('Erro ao verificar forma de pagamento:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }

        if (!formaPagamentoValida) {
            return res.status(400).json({
                success: false,
                message: 'Forma de pagamento inválida ou não disponível'
            });
        }

        // Validar número de parcelas
        if (parcelas < 1 || parcelas > formaPagamentoValida.parcelas_maximas) {
            return res.status(400).json({
                success: false,
                message: `Número de parcelas inválido para ${formaPagamento}. Máximo: ${formaPagamentoValida.parcelas_maximas}x`
            });
        }

        // Verificar se o voo existe e tem assentos disponíveis
        const queryVoo = `
            SELECT v.*, a.capacidade 
            FROM voos v 
            LEFT JOIN aeronaves a ON v.aeronave_id = a.id 
            WHERE v.id = ?
        `;

        db.get(queryVoo, [voo_id], (err, voo) => {
            if (err) {
                console.error('Erro ao buscar voo:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erro interno do servidor'
                });
            }

            if (!voo) {
                return res.status(404).json({
                    success: false,
                    message: 'Voo não encontrado'
                });
            }

            if (voo.assentos_disponiveis <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Não há assentos disponíveis neste voo'
                });
            }

            // Verificar se usuário existe
            db.get("SELECT * FROM usuarios WHERE id = ?", [usuario_id], (err, usuario) => {
                if (err) {
                    console.error('Erro ao buscar usuário:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Erro interno do servidor'
                    });
                }

                if (!usuario) {
                    return res.status(404).json({
                        success: false,
                        message: 'Usuário não encontrado'
                    });
                }

                // Gerar número de assento automático (simplificado)
                const letras = ['A', 'B', 'C', 'D', 'E', 'F'];
                const numero = Math.floor(Math.random() * 30) + 1;
                const letra = letras[Math.floor(Math.random() * letras.length)];
                const assento = numero + letra;

                // Inserir passagem com dados de pagamento (SIMPLIFICADO)
                db.run(
                    `INSERT INTO passagens (
                        voo_id, usuario_id, assento, 
                        forma_pagamento, parcelas, preco_final,
                        classe, data_compra, status
                    ) VALUES (?, ?, ?, ?, ?, ?, 'economica', datetime('now'), 'confirmada')`,
                    [voo_id, usuario_id, assento, formaPagamento, parcelas, preco_final],
                    function(err) {
                        if (err) {
                            console.error('Erro ao comprar passagem:', err);
                            return res.status(500).json({
                                success: false,
                                message: 'Erro ao comprar passagem: ' + err.message
                            });
                        }

                        const passagemId = this.lastID;

                        // Atualizar assentos disponíveis
                        db.run(
                            "UPDATE voos SET assentos_disponiveis = assentos_disponiveis - 1 WHERE id = ?",
                            [voo_id],
                            function(err) {
                                if (err) {
                                    console.error('Erro ao atualizar assentos:', err);
                                    // Continua mesmo com erro na atualização
                                }

                                console.log('Passagem comprada com sucesso. ID:', passagemId);
                                
                                // Buscar informações completas para resposta
                                const queryCompleta = `
                                    SELECT 
                                        p.*,
                                        v.codigo, v.origem, v.destino, 
                                        v.data_partida, v.hora_partida,
                                        u.nome as usuario_nome,
                                        a.modelo as aeronave_modelo
                                    FROM passagens p
                                    JOIN voos v ON p.voo_id = v.id
                                    JOIN usuarios u ON p.usuario_id = u.id
                                    LEFT JOIN aeronaves a ON v.aeronave_id = a.id
                                    WHERE p.id = ?
                                `;

                                db.get(queryCompleta, [passagemId], (err, passagemCompleta) => {
                                    if (err) {
                                        console.error('Erro ao buscar dados completos:', err);
                                        // Envia resposta básica mesmo com erro
                                        return res.json({
                                            success: true,
                                            message: 'Passagem comprada com sucesso!',
                                            passagemId: passagemId,
                                            assento: assento,
                                            formaPagamento: formaPagamento,
                                            parcelas: parcelas,
                                            precoFinal: preco_final,
                                            codigo: `P${passagemId.toString().padStart(6, '0')}`
                                        });
                                    }

                                    const resposta = {
                                        success: true,
                                        message: 'Passagem comprada com sucesso!',
                                        passagemId: passagemId,
                                        assento: assento,
                                        formaPagamento: formaPagamento,
                                        parcelas: parcelas,
                                        precoFinal: parseFloat(preco_final),
                                        codigo: `P${passagemId.toString().padStart(6, '0')}`,
                                        voo: {
                                            codigo: passagemCompleta?.codigo || voo.codigo,
                                            origem: passagemCompleta?.origem || voo.origem,
                                            destino: passagemCompleta?.destino || voo.destino,
                                            data_partida: passagemCompleta?.data_partida || voo.data_partida,
                                            hora_partida: passagemCompleta?.hora_partida || voo.hora_partida
                                        }
                                    };

                                    // Adicionar mensagens específicas por forma de pagamento
                                    if (formaPagamento === 'PIX') {
                                        resposta.mensagemPagamento = 'Pagamento via PIX - 5% de desconto aplicado!';
                                    } else if (formaPagamento === 'Boleto Bancário' && parcelas === 1) {
                                        resposta.mensagemPagamento = 'Pagamento via Boleto - 3% de desconto aplicado!';
                                    } else if (formaPagamento === 'Cartão de Crédito') {
                                        resposta.mensagemPagamento = `Pagamento em ${parcelas}x no boleto`;
                                    } else {
                                        resposta.mensagemPagamento = 'Pagamento processado com sucesso!';
                                    }

                                    console.log('Enviando resposta completa para frontend');
                                    res.json(resposta);
                                });
                            }
                        );
                    }
                );
            });
        });
    });
});

// Buscar passagens por usuário
router.get('/usuario/:id', (req, res) => {
    const { id } = req.params;

    console.log('Buscando passagens para usuário ID:', id);

    const query = `
        SELECT 
            p.*, 
            v.codigo, v.origem, v.destino, v.data_partida, v.hora_partida,
            v.preco_base as preco_original,
            u.nome as usuario_nome,
            a.modelo as aeronave_modelo
        FROM passagens p
        JOIN voos v ON p.voo_id = v.id
        JOIN usuarios u ON p.usuario_id = u.id
        LEFT JOIN aeronaves a ON v.aeronave_id = a.id
        WHERE p.usuario_id = ?
        ORDER BY p.data_compra DESC
    `;

    db.all(query, [id], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar passagens:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar passagens'
            });
        }

        console.log(`Encontradas ${rows.length} passagens para usuário ID: ${id}`);
        
        res.json({
            success: true,
            passagens: rows,
            total: rows.length
        });
    });
});

// Buscar todas as passagens (para administração)
router.get('/', (req, res) => {
    log('🔍 Buscando todas as passagens (admin)');

    const query = `
        SELECT 
            p.*, 
            v.codigo, v.origem, v.destino, v.data_partida, v.hora_partida,
            v.preco_base as preco_original,
            u.nome as usuario_nome, u.cpf as usuario_cpf,
            a.modelo as aeronave_modelo
        FROM passagens p
        JOIN voos v ON p.voo_id = v.id
        JOIN usuarios u ON p.usuario_id = u.id
        LEFT JOIN aeronaves a ON v.aeronave_id = a.id
        ORDER BY p.data_compra DESC
    `;

    db.all(query, (err, rows) => {
        if (err) {
            console.error('Erro ao buscar passagens:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar passagens'
            });
        }

        log(`Encontradas ${rows.length} passagens no total`);

        res.json({
            success: true,
            passagens: rows,
            total: rows.length
        });
    });
});

// Cancelar passagem
router.post('/cancelar/:id', (req, res) => {
    const { id } = req.params;

    log(`Tentativa de cancelamento da passagem ID: ${id}`);

    // Buscar passagem para obter o voo_id
    db.get(`
        SELECT p.*, v.data_partida, v.hora_partida 
        FROM passagens p 
        JOIN voos v ON p.voo_id = v.id 
        WHERE p.id = ?
    `, [id], (err, passagem) => {
        if (err) {
            console.error('Erro ao buscar passagem:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }

        if (!passagem) {
            return res.status(404).json({
                success: false,
                message: 'Passagem não encontrado'
            });
        }

        // Verificar se o cancelamento é possível (não muito próximo do voo)
        const dataVoo = new Date(`${passagem.data_partida} ${passagem.hora_partida}`);
        const agora = new Date();
        const diferencaHoras = (dataVoo - agora) / (1000 * 60 * 60);

        if (diferencaHoras < 24) {
            return res.status(400).json({
                success: false,
                message: 'Cancelamento não permitido a menos de 24 horas do voo'
            });
        }

        // Deletar passagem
        db.run("DELETE FROM passagens WHERE id = ?", [id], function(err) {
            if (err) {
                console.error('Erro ao cancelar passagem:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erro ao cancelar passagem'
                });
            }

            // Atualizar assentos disponíveis
            db.run(
                "UPDATE voos SET assentos_disponiveis = assentos_disponiveis + 1 WHERE id = ?",
                [passagem.voo_id],
                function(err) {
                    if (err) {
                        console.error('Erro ao atualizar assentos:', err);
                    }

                    log(`Passagem ${id} cancelada com sucesso`);
                    
                    res.json({
                        success: true,
                        message: 'Passagem cancelada com sucesso!',
                        reembolso: passagem.preco_final * 0.8 // 80% de reembolso
                    });
                }
            );
        });
    });
});

// Fazer check-in para passagem
router.post('/checkin/:id', (req, res) => {
    const { id } = req.params;
    const { bagagens = 0 } = req.body;

    log(`Tentativa de check-in para passagem ID: ${id}`);

    // Verificar se passagem existe
    db.get("SELECT * FROM passagens WHERE id = ?", [id], (err, passagem) => {
        if (err) {
            console.error('Erro ao buscar passagem:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }

        if (!passagem) {
            return res.status(404).json({
                success: false,
                message: 'Passagem não encontrada'
            });
        }

        // Verificar se já fez check-in
        db.get("SELECT * FROM checkins WHERE passagem_id = ?", [id], (err, checkinExistente) => {
            if (err) {
                console.error('Erro ao verificar check-in:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erro interno do servidor'
                });
            }

            if (checkinExistente) {
                return res.status(400).json({
                    success: false,
                    message: 'Check-in já realizado para esta passagem'
                });
            }

            // Fazer check-in
            db.run(
                "INSERT INTO checkins (passagem_id, bagagens, status) VALUES (?, ?, 'concluido')",
                [id, bagagens],
                function(err) {
                    if (err) {
                        console.error('Erro ao fazer check-in:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'Erro ao fazer check-in'
                        });
                    }

                    log(`Check-in realizado com sucesso para passagem ${id}`);
                    
                    res.json({
                        success: true,
                        message: 'Check-in realizado com sucesso!',
                        checkinId: this.lastID,
                        bagagens: bagagens
                    });
                }
            );
        });
    });
});

// Estatísticas de vendas por forma de pagamento
router.get('/estatisticas/pagamento', (req, res) => {
    log('Buscando estatísticas de pagamento');

    db.all(`
        SELECT 
            forma_pagamento,
            COUNT(*) as quantidade,
            SUM(preco_final) as total_vendido,
            AVG(preco_final) as media_valor
        FROM passagens 
        GROUP BY forma_pagamento
        ORDER BY total_vendido DESC
    `, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar estatísticas:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }

        res.json({
            success: true,
            estatisticas: rows
        });
    });
});

// Buscar check-ins por voo (para comissários)
router.get('/checkins/voo/:vooId', (req, res) => {
    const { vooId } = req.params;

    log(`Buscando check-ins para voo ID: ${vooId}`);

    const query = `
        SELECT 
            c.*,
            p.assento, p.classe,
            u.nome as passageiro_nome, u.cpf,
            v.codigo as voo_codigo
        FROM checkins c
        JOIN passagens p ON c.passagem_id = p.id
        JOIN usuarios u ON p.usuario_id = u.id
        JOIN voos v ON p.voo_id = v.id
        WHERE p.voo_id = ?
        ORDER BY p.assento
    `;

    db.all(query, [vooId], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar check-ins:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar check-ins'
            });
        }

        res.json({
            success: true,
            checkins: rows,
            total: rows.length
        });
    });
});

module.exports = router;
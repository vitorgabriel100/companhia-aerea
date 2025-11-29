const express = require('express');
const { db } = require('../models/database');
const router = express.Router();

// Middleware de log
const log = (mensagem) => {
    console.log(mensagem);
};

// Processar pagamento (ATUALIZADO)
router.post('/processar', async (req, res) => {
    const { 
        voo_id, 
        usuario_id, 
        forma_pagamento, 
        parcelas = 1, 
        classe = 'economica',
        dados_pagamento 
    } = req.body;

    log('💳 Processando pagamento:', { 
        voo_id, 
        usuario_id, 
        forma_pagamento, 
        parcelas,
        classe
    });

    try {
        // Validar dados obrigatórios
        if (!voo_id || !usuario_id || !forma_pagamento) {
            return res.json({ 
                success: false, 
                message: 'Voo, usuário e forma de pagamento são obrigatórios' 
            });
        }

        // Verificar forma de pagamento válida
        const formaPagamentoValida = await new Promise((resolve, reject) => {
            db.get(
                "SELECT * FROM formas_pagamento WHERE nome = ? AND ativo = 1", 
                [forma_pagamento], 
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (!formaPagamentoValida) {
            return res.json({ 
                success: false, 
                message: 'Forma de pagamento inválida ou não disponível' 
            });
        }

        // Validar número de parcelas
        if (parcelas < 1 || parcelas > formaPagamentoValida.parcelas_maximas) {
            return res.json({ 
                success: false, 
                message: `Número de parcelas inválido. Máximo: ${formaPagamentoValida.parcelas_maximas}x` 
            });
        }

        // Verificar se o voo existe e tem assentos disponíveis
        const queryVoo = `
            SELECT v.*, a.capacidade, a.modelo as aeronave_modelo
            FROM voos v 
            LEFT JOIN aeronaves a ON v.aeronave_id = a.id 
            WHERE v.id = ?
        `;

        const voo = await new Promise((resolve, reject) => {
            db.get(queryVoo, [voo_id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!voo) {
            return res.json({ 
                success: false, 
                message: 'Voo não encontrado' 
            });
        }

        if (voo.assentos_disponiveis <= 0) {
            return res.json({ 
                success: false, 
                message: 'Não há assentos disponíveis neste voo' 
            });
        }

        // Verificar se usuário existe
        const usuario = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM usuarios WHERE id = ?", [usuario_id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!usuario) {
            return res.json({ 
                success: false, 
                message: 'Usuário não encontrado' 
            });
        }

        // Calcular preço baseado na classe
        let precoBase = parseFloat(voo.preco_base);
        let multiplicadorClasse = 1.0;

        switch (classe) {
            case 'executiva':
                multiplicadorClasse = 1.5;
                break;
            case 'primeira':
                multiplicadorClasse = 2.0;
                break;
            default: // economica
                multiplicadorClasse = 1.0;
        }

        let precoFinal = precoBase * multiplicadorClasse;
        let descontoAplicado = 0;

        // Aplicar descontos por forma de pagamento
        if (forma_pagamento === 'PIX') {
            descontoAplicado = precoFinal * 0.05;
            precoFinal = precoFinal - descontoAplicado;
        } else if (forma_pagamento === 'Boleto Bancário' && parcelas === 1) {
            descontoAplicado = precoFinal * 0.03;
            precoFinal = precoFinal - descontoAplicado;
        }

        // Gerar número de assento baseado na classe
        const assentosOcupados = await new Promise((resolve, reject) => {
            db.get(
                `SELECT COUNT(*) as total 
                 FROM passagens 
                 WHERE voo_id = ? AND classe = ?`,
                [voo_id, classe],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.total);
                }
            );
        });

        let assento = '';
        
        // Lógica de assentos por classe
        if (classe === 'primeira') {
            const fileira = 'P';
            const numero = (assentosOcupados % 8) + 1;
            assento = `${fileira}${numero}`;
        } else if (classe === 'executiva') {
            const fileira = String.fromCharCode(69 + Math.floor(assentosOcupados / 6)); // E, F...
            const numero = (assentosOcupados % 6) + 1;
            assento = `${fileira}${numero}`;
        } else { // economica
            const fileira = String.fromCharCode(65 + Math.floor(assentosOcupados / 30)); // A, B, C...
            const numero = (assentosOcupados % 30) + 1;
            assento = `${fileira}${numero}`;
        }

        // Simular processamento do pagamento
        const processamentoPagamento = await simularProcessamentoPagamento({
            forma_pagamento,
            parcelas,
            valor: precoFinal,
            dados_pagamento
        });

        if (!processamentoPagamento.sucesso) {
            return res.json({
                success: false,
                message: `Falha no pagamento: ${processamentoPagamento.mensagem}`
            });
        }

        // Inserir passagem no banco de dados
        const passagemId = await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO passagens (
                    voo_id, usuario_id, assento, 
                    forma_pagamento, parcelas, preco_final,
                    classe, data_compra, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), 'confirmada')`,
                [voo_id, usuario_id, assento, forma_pagamento, parcelas, precoFinal, classe],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });

        // Atualizar assentos disponíveis
        await new Promise((resolve, reject) => {
            db.run(
                "UPDATE voos SET assentos_disponiveis = assentos_disponiveis - 1 WHERE id = ?",
                [voo_id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        log(`Pagamento processado com sucesso. Passagem ID: ${passagemId}`);

        // Buscar informações completas para resposta
        const passagemCompleta = await new Promise((resolve, reject) => {
            const query = `
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

            db.get(query, [passagemId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const resposta = {
            success: true,
            message: 'Pagamento processado com sucesso!',
            passagemId: passagemId,
            codigo: `P${passagemId.toString().padStart(6, '0')}`,
            assento: assento,
            classe: classe,
            formaPagamento: forma_pagamento,
            parcelas: parcelas,
            precoOriginal: parseFloat(precoBase * multiplicadorClasse),
            precoFinal: parseFloat(precoFinal.toFixed(2)),
            descontoAplicado: parseFloat(descontoAplicado.toFixed(2)),
            dadosVoo: {
                codigo: passagemCompleta.codigo,
                origem: passagemCompleta.origem,
                destino: passagemCompleta.destino,
                data_partida: passagemCompleta.data_partida,
                hora_partida: passagemCompleta.hora_partida,
                aeronave: passagemCompleta.aeronave_modelo
            },
            processamento: {
                id_transacao: processamentoPagamento.id_transacao,
                status: processamentoPagamento.status,
                mensagem: processamentoPagamento.mensagem
            }
        };

        // Adicionar mensagem específica por forma de pagamento
        if (forma_pagamento === 'PIX') {
            resposta.mensagemPagamento = 'Pagamento via PIX - 5% de desconto aplicado!';
        } else if (forma_pagamento === 'Boleto Bancário' && parcelas === 1) {
            resposta.mensagemPagamento = 'Pagamento via Boleto - 3% de desconto aplicado!';
        } else if (forma_pagamento === 'Cartão de Crédito') {
            resposta.mensagemPagamento = `Pagamento em ${parcelas}x no cartão processado com sucesso!`;
        }

        res.json(resposta);

    } catch (error) {
        console.error('Erro no processamento do pagamento:', error);
        res.json({ 
            success: false, 
            message: 'Erro ao processar pagamento',
            erro: error.message 
        });
    }
});

// Simular processamento de pagamento (NOVO)
async function simularProcessamentoPagamento(dados) {
    log(`Simulando processamento de ${dados.forma_pagamento}`);
    
    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simular diferentes cenários baseados na forma de pagamento
    switch (dados.forma_pagamento) {
        case 'Cartão de Crédito':
            // Simular validação de cartão
            if (!dados.dados_pagamento || !dados.dados_pagamento.numero_cartao) {
                return {
                    sucesso: false,
                    mensagem: 'Dados do cartão incompletos'
                };
            }
            
            // Simular aprovação (90% de chance)
            if (Math.random() > 0.1) {
                return {
                    sucesso: true,
                    id_transacao: `CC${Date.now()}`,
                    status: 'aprovado',
                    mensagem: 'Pagamento aprovado pelo banco emissor'
                };
            } else {
                return {
                    sucesso: false,
                    id_transacao: `CC${Date.now()}`,
                    status: 'recusado',
                    mensagem: 'Cartão recusado pela operadora'
                };
            }

        case 'PIX':
            // PIX sempre é instantâneo (na simulação)
            return {
                sucesso: true,
                id_transacao: `PX${Date.now()}`,
                status: 'concluido',
                mensagem: 'Pagamento PIX realizado com sucesso'
            };

        case 'Boleto Bancário':
            // Boleto sempre gera pendência
            const codigoBarras = generateCodigoBarras();
            return {
                sucesso: true,
                id_transacao: `BL${Date.now()}`,
                status: 'pendente',
                mensagem: 'Boleto gerado com sucesso',
                codigo_barras: codigoBarras,
                vencimento: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };

        default:
            return {
                sucesso: false,
                mensagem: 'Forma de pagamento não suportada'
            };
    }
}

// Gerar código de barras fictício (NOVO)
function generateCodigoBarras() {
    let codigo = '';
    for (let i = 0; i < 44; i++) {
        codigo += Math.floor(Math.random() * 10);
    }
    return codigo;
}

// Verificar status de pagamento (NOVO)
router.get('/status/:passagemId', (req, res) => {
    const { passagemId } = req.params;

    log(`🔍 Verificando status do pagamento para passagem: ${passagemId}`);

    const query = `
        SELECT 
            p.*,
            v.codigo as voo_codigo,
            u.nome as usuario_nome
        FROM passagens p
        JOIN voos v ON p.voo_id = v.id
        JOIN usuarios u ON p.usuario_id = u.id
        WHERE p.id = ?
    `;

    db.get(query, [passagemId], (err, passagem) => {
        if (err) {
            console.error('Erro ao buscar passagem:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar informações do pagamento'
            });
        }

        if (!passagem) {
            return res.json({
                success: false,
                message: 'Passagem não encontrada'
            });
        }

        let statusPagamento = 'confirmado';
        let mensagemStatus = 'Pagamento confirmado';

        if (passagem.forma_pagamento === 'Boleto Bancário') {
            // Simular status do boleto (50% chance de estar pago)
            statusPagamento = Math.random() > 0.5 ? 'pago' : 'pendente';
            mensagemStatus = statusPagamento === 'pago' 
                ? 'Boleto pago com sucesso' 
                : 'Aguardando pagamento do boleto';
        }

        res.json({
            success: true,
            passagemId: passagemId,
            status: statusPagamento,
            formaPagamento: passagem.forma_pagamento,
            mensagem: mensagemStatus,
            dados: {
                voo: passagem.voo_codigo,
                passageiro: passagem.usuario_nome,
                valor: passagem.preco_final,
                data_compra: passagem.data_compra
            }
        });
    });
});

// Obter formas de pagamento disponíveis (NOVO)
router.get('/formas-disponiveis', (req, res) => {
    log('Buscando formas de pagamento disponíveis');

    db.all(`
        SELECT id, nome, parcelas_maximas, 
               CASE 
                   WHEN nome = 'PIX' THEN 'Desconto de 5%'
                   WHEN nome = 'Boleto Bancário' THEN 'Desconto de 3% à vista'
                   ELSE 'Sem desconto'
               END as beneficio
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

module.exports = router;
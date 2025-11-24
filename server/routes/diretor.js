const express = require('express');
const { db } = require('../models/database');
const router = express.Router();

// Middleware de log
const log = (mensagem) => {
    console.log(mensagem);
};

// Rota para obter estatísticas gerais do sistema
router.get('/estatisticas', (req, res) => {
    log('📊 Buscando estatísticas gerais para diretor...');

    const queries = {
        totalVoos: "SELECT COUNT(*) as total FROM voos",
        totalUsuarios: "SELECT COUNT(*) as total FROM usuarios",
        totalPassagens: "SELECT COUNT(*) as total FROM passagens",
        totalAeronaves: "SELECT COUNT(*) as total FROM aeronaves",
        voosAtivos: "SELECT COUNT(*) as total FROM voos WHERE status = 'agendado'",
        voosConcluidos: "SELECT COUNT(*) as total FROM voos WHERE status = 'concluido'",
        receitaTotal: "SELECT SUM(preco_final) as total FROM passagens",
        ocupacaoMedia: `
            SELECT AVG((capacidade - assentos_disponiveis) * 100.0 / capacidade) as media 
            FROM voos v JOIN aeronaves a ON v.aeronave_id = a.id 
            WHERE v.assentos_disponiveis < v.capacidade
        `
    };

    const resultados = {};
    let queriesProcessadas = 0;
    const totalQueries = Object.keys(queries).length;

    Object.keys(queries).forEach(key => {
        db.get(queries[key], [], (err, row) => {
            if (err) {
                console.error(`❌ Erro ao buscar ${key}:`, err);
                resultados[key] = 0;
            } else {
                resultados[key] = row.total || 0;
            }

            queriesProcessadas++;
            
            if (queriesProcessadas === totalQueries) {
                // Formatar resultados
                const estatisticas = {
                    totalVoos: resultados.totalVoos,
                    totalUsuarios: resultados.totalUsuarios,
                    totalPassagens: resultados.totalPassagens,
                    totalAeronaves: resultados.totalAeronaves,
                    voosAtivos: resultados.voosAtivos,
                    voosConcluidos: resultados.voosConcluidos,
                    receitaTotal: parseFloat(resultados.receitaTotal || 0).toFixed(2),
                    ocupacaoMedia: resultados.ocupacaoMedia ? parseFloat(resultados.ocupacaoMedia).toFixed(1) + '%' : '0%'
                };

                log(`✅ Estatísticas geradas: ${estatisticas.totalVoos} voos, R$ ${estatisticas.receitaTotal} receita`);
                
                res.json({
                    success: true,
                    estatisticas: estatisticas
                });
            }
        });
    });
});

// Rota para obter relatório detalhado de voos
router.get('/relatorio-voos', (req, res) => {
    const { periodo = 'mes' } = req.query;
    log(`📈 Gerando relatório de voos para período: ${periodo}`);

    let whereClause = '';
    switch (periodo) {
        case 'hoje':
            whereClause = "WHERE date(v.data_partida) = date('now')";
            break;
        case 'semana':
            whereClause = "WHERE v.data_partida >= date('now', '-7 days')";
            break;
        case 'mes':
            whereClause = "WHERE v.data_partida >= date('now', '-30 days')";
            break;
        case 'ano':
            whereClause = "WHERE v.data_partida >= date('now', '-365 days')";
            break;
        default:
            whereClause = "WHERE v.data_partida >= date('now', '-30 days')";
    }

    const query = `
        SELECT 
            v.id,
            v.codigo,
            v.origem,
            v.destino,
            v.data_partida,
            v.hora_partida,
            v.status,
            v.assentos_disponiveis,
            a.modelo as aeronave_modelo,
            a.capacidade,
            COUNT(p.id) as passagens_vendidas,
            COALESCE(SUM(p.preco_final), 0) as receita_voo,
            (a.capacidade - v.assentos_disponiveis) as assentos_ocupados,
            ROUND(((a.capacidade - v.assentos_disponiveis) * 100.0 / a.capacidade), 2) as taxa_ocupacao
        FROM voos v
        LEFT JOIN aeronaves a ON v.aeronave_id = a.id
        LEFT JOIN passagens p ON v.id = p.voo_id
        ${whereClause}
        GROUP BY v.id
        ORDER BY v.data_partida DESC, v.hora_partida DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('❌ Erro ao gerar relatório de voos:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao gerar relatório de voos'
            });
        }

        // Calcular totais
        const totais = {
            totalVoos: rows.length,
            totalPassagens: rows.reduce((sum, voo) => sum + (voo.passagens_vendidas || 0), 0),
            totalReceita: rows.reduce((sum, voo) => sum + parseFloat(voo.receita_voo || 0), 0),
            ocupacaoMedia: rows.length > 0 ? 
                (rows.reduce((sum, voo) => sum + parseFloat(voo.taxa_ocupacao || 0), 0) / rows.length).toFixed(1) + '%' : '0%'
        };

        log(`✅ Relatório de voos gerado: ${rows.length} voos no período`);
        
        res.json({
            success: true,
            voos: rows,
            totais: totais,
            periodo: periodo
        });
    });
});

// Rota para obter relatório de vendas por forma de pagamento
router.get('/relatorio-vendas', (req, res) => {
    log('💰 Gerando relatório de vendas...');

    const query = `
        SELECT 
            p.forma_pagamento,
            COUNT(p.id) as quantidade_vendas,
            SUM(p.preco_final) as total_receita,
            AVG(p.preco_final) as ticket_medio,
            ROUND((COUNT(p.id) * 100.0 / (SELECT COUNT(*) FROM passagens)), 2) as percentual
        FROM passagens p
        GROUP BY p.forma_pagamento
        ORDER BY total_receita DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('❌ Erro ao gerar relatório de vendas:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao gerar relatório de vendas'
            });
        }

        const totais = {
            totalVendas: rows.reduce((sum, venda) => sum + venda.quantidade_vendas, 0),
            totalReceita: rows.reduce((sum, venda) => sum + parseFloat(venda.total_receita), 0)
        };

        log(`✅ Relatório de vendas gerado: ${rows.length} formas de pagamento`);
        
        res.json({
            success: true,
            vendas: rows,
            totais: totais
        });
    });
});

// Rota para obter relatório de desempenho de rotas
router.get('/relatorio-rotas', (req, res) => {
    log('🛣️ Gerando relatório de rotas...');

    const query = `
        SELECT 
            v.origem,
            v.destino,
            COUNT(v.id) as total_voos,
            COUNT(p.id) as total_passagens,
            SUM(p.preco_final) as receita_rota,
            AVG(p.preco_final) as preco_medio,
            ROUND(AVG(a.capacidade - v.assentos_disponiveis), 2) as ocupacao_media
        FROM voos v
        LEFT JOIN passagens p ON v.id = p.voo_id
        LEFT JOIN aeronaves a ON v.aeronave_id = a.id
        GROUP BY v.origem, v.destino
        ORDER BY receita_rota DESC
        LIMIT 20
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erro ao gerar relatório de rotas:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao gerar relatório de rotas'
            });
        }

        log(`Relatório de rotas gerado: ${rows.length} rotas analisadas`);
        
        res.json({
            success: true,
            rotas: rows
        });
    });
});

// Rota para obter relatório de usuários
router.get('/relatorio-usuarios', (req, res) => {
    log('Gerando relatório de usuários...');

    const query = `
        SELECT 
            tipo,
            COUNT(*) as total,
            ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM usuarios)), 2) as percentual,
            SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) as ativos,
            SUM(CASE WHEN status = 'inativo' THEN 1 ELSE 0 END) as inativos
        FROM usuarios
        GROUP BY tipo
        ORDER BY total DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erro ao gerar relatório de usuários:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao gerar relatório de usuários'
            });
        }

        const totais = {
            totalUsuarios: rows.reduce((sum, user) => sum + user.total, 0),
            totalAtivos: rows.reduce((sum, user) => sum + user.ativos, 0),
            totalInativos: rows.reduce((sum, user) => sum + user.inativos, 0)
        };

        log(`Relatório de usuários gerado: ${totais.totalUsuarios} usuários no total`);
        
        res.json({
            success: true,
            usuarios: rows,
            totais: totais
        });
    });
});

// Rota para obter dados para gráficos
router.get('/dados-graficos', (req, res) => {
    log('Gerando dados para gráficos...');

    const queries = {
        // Vendas por mês (últimos 6 meses)
        vendasPorMes: `
            SELECT 
                strftime('%Y-%m', p.data_compra) as mes,
                COUNT(p.id) as total_vendas,
                SUM(p.preco_final) as receita
            FROM passagens p
            WHERE p.data_compra >= date('now', '-6 months')
            GROUP BY strftime('%Y-%m', p.data_compra)
            ORDER BY mes
        `,
        
        // Voos por status
        voosPorStatus: `
            SELECT 
                status,
                COUNT(*) as total
            FROM voos
            GROUP BY status
        `,
        
        // Top 10 voos mais rentáveis
        topVoosRentaveis: `
            SELECT 
                v.codigo,
                v.origem,
                v.destino,
                COUNT(p.id) as passagens_vendidas,
                SUM(p.preco_final) as receita
            FROM voos v
            JOIN passagens p ON v.id = p.voo_id
            GROUP BY v.id
            ORDER BY receita DESC
            LIMIT 10
        `,
        
        // Distribuição de classes
        distribuicaoClasses: `
            SELECT 
                classe,
                COUNT(*) as total,
                ROUND(AVG(preco_final), 2) as preco_medio
            FROM passagens
            GROUP BY classe
        `
    };

    const resultados = {};
    let queriesProcessadas = 0;

    Object.keys(queries).forEach(key => {
        db.all(queries[key], [], (err, rows) => {
            if (err) {
                console.error(`Erro ao buscar dados para ${key}:`, err);
                resultados[key] = [];
            } else {
                resultados[key] = rows;
            }

            queriesProcessadas++;
            
            if (queriesProcessadas === Object.keys(queries).length) {
                log('Dados para gráficos gerados com sucesso');
                
                res.json({
                    success: true,
                    dados: resultados
                });
            }
        });
    });
});

// Rota para obter alertas e insights
router.get('/alertas', (req, res) => {
    log('Buscando alertas do sistema...');

    const alertas = [];

    // Verificar voos com baixa ocupação
    db.all(`
        SELECT codigo, origem, destino, data_partida, 
               ROUND(((capacidade - assentos_disponiveis) * 100.0 / capacidade), 2) as ocupacao
        FROM voos v 
        JOIN aeronaves a ON v.aeronave_id = a.id
        WHERE v.data_partida >= date('now')
        AND ocupacao < 30
        ORDER BY ocupacao ASC
        LIMIT 5
    `, [], (err, voosBaixaOcupacao) => {
        if (!err && voosBaixaOcupacao.length > 0) {
            alertas.push({
                tipo: 'alerta',
                titulo: 'Voos com Baixa Ocupação',
                mensagem: `${voosBaixaOcupacao.length} voos com ocupação abaixo de 30%`,
                dados: voosBaixaOcupacao
            });
        }

        // Verificar aeronaves com manutenção pendente
        db.all(`
            SELECT codigo, modelo, status 
            FROM aeronaves 
            WHERE status != 'disponivel'
        `, [], (err, aeronavesIndisponiveis) => {
            if (!err && aeronavesIndisponiveis.length > 0) {
                alertas.push({
                    tipo: 'aviso',
                    titulo: 'Aeronaves Indisponíveis',
                    mensagem: `${aeronavesIndisponiveis.length} aeronaves não estão disponíveis`,
                    dados: aeronavesIndisponiveis
                });
            }

            log(`${alertas.length} alertas encontrados`);
            
            res.json({
                success: true,
                alertas: alertas
            });
        });
    });
});

module.exports = router;
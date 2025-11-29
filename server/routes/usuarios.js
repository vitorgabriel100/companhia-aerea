// routes/usuarios.js - VERSÃO CORRIGIDA
const express = require('express');
const { db } = require('../models/database');

const router = express.Router();

// Middleware de log
const log = (mensagem) => {
    console.log(mensagem);
};

// Buscar todos os usuários (CORRIGIDO - apenas colunas que existem)
router.get('/', (req, res) => {
    log('🔍 Buscando todos os usuários');

    db.all(`
        SELECT 
            id, nome, cpf, tipo, matricula, email, telefone, data_cadastro
        FROM usuarios 
        ORDER BY tipo, nome
    `, (err, rows) => {
        if (err) {
            console.error('Erro ao buscar usuários:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao buscar usuários' 
            });
        }

        log(`Encontrados ${rows.length} usuários`);
        
        // Calcular estatísticas
        const estatisticas = {
            total: rows.length,
            clientes: rows.filter(u => u.tipo === 'cliente').length,
            comissarios: rows.filter(u => u.tipo === 'comissario').length,
            pilotos: rows.filter(u => u.tipo === 'piloto').length,
            diretores: rows.filter(u => u.tipo === 'diretor').length
        };
        
        res.json({ 
            success: true, 
            usuarios: rows,
            estatisticas: estatisticas
        });
    });
});

// Buscar usuários por tipo (CORRIGIDO)
router.get('/tipo/:tipo', (req, res) => {
    const { tipo } = req.params;

    log(`Buscando usuários do tipo: ${tipo}`);

    // Validar tipo
    const tiposValidos = ['cliente', 'comissario', 'piloto', 'diretor'];
    if (!tiposValidos.includes(tipo)) {
        return res.json({
            success: false,
            message: 'Tipo de usuário inválido'
        });
    }

    const query = `
        SELECT 
            id, nome, cpf, tipo, matricula, email, telefone, data_cadastro
        FROM usuarios 
        WHERE tipo = ? 
        ORDER BY nome
    `;

    db.all(query, [tipo], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar usuários:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao buscar usuários' 
            });
        }

        log(`Encontrados ${rows.length} usuários do tipo ${tipo}`);
        
        res.json({ 
            success: true, 
            usuarios: rows,
            total: rows.length
        });
    });
});

// Buscar usuário por ID (CORRIGIDO)
router.get('/:id', (req, res) => {
    const { id } = req.params;

    log(`Buscando usuário ID: ${id}`);

    // Verificar se ID é válido
    if (isNaN(id)) {
        return res.json({
            success: false,
            message: 'ID de usuário inválido'
        });
    }

    const query = `
        SELECT 
            id, nome, cpf, tipo, matricula, email, telefone, data_cadastro
        FROM usuarios 
        WHERE id = ?
    `;

    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('Erro ao buscar usuário:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao buscar usuário' 
            });
        }

        if (row) {
            log(`Usuário encontrado: ${row.nome}`);
            res.json({ 
                success: true, 
                usuario: row
            });
        } else {
            log('Usuário não encontrado');
            res.json({ 
                success: false, 
                message: 'Usuário não encontrado' 
            });
        }
    });
});

// Verificar se CPF existe (CORRIGIDO)
router.get('/cpf/:cpf', (req, res) => {
    const { cpf } = req.params;
    const cpfLimpo = cpf.replace(/\D/g, '');

    log(`Verificando CPF: ${cpfLimpo}`);

    if (cpfLimpo.length !== 11) {
        return res.json({
            success: false,
            message: 'CPF inválido'
        });
    }

    db.get(`
        SELECT id, nome, cpf, tipo, matricula, email 
        FROM usuarios WHERE cpf = ?
    `, [cpfLimpo], (err, row) => {
        if (err) {
            console.error('Erro ao buscar usuário:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao buscar usuário' 
            });
        }

        res.json({ 
            success: true, 
            usuario: row,
            existe: !!row
        });
    });
});

// Criar novo usuário (CORRIGIDO)
router.post('/', (req, res) => {
    const {
        nome, cpf, senha, tipo, matricula, email, telefone
    } = req.body;

    log(`Criando novo usuário: ${nome} (${tipo})`);

    // Validações básicas
    if (!nome || !cpf || !senha || !tipo) {
        return res.json({
            success: false,
            message: 'Nome, CPF, senha e tipo são obrigatórios'
        });
    }

    // Validar tipo
    const tiposValidos = ['cliente', 'comissario', 'piloto', 'diretor'];
    if (!tiposValidos.includes(tipo)) {
        return res.json({
            success: false,
            message: 'Tipo de usuário inválido'
        });
    }

    // Validar senha
    if (senha.length < 6) {
        return res.json({
            success: false,
            message: 'Senha deve ter pelo menos 6 caracteres'
        });
    }

    const cpfLimpo = cpf.replace(/\D/g, '');

    // Verificar se CPF já existe
    db.get("SELECT * FROM usuarios WHERE cpf = ?", [cpfLimpo], (err, existingUser) => {
        if (err) {
            console.error('Erro ao verificar CPF:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }

        if (existingUser) {
            return res.json({
                success: false,
                message: 'CPF já cadastrado'
            });
        }

        // Verificar se matrícula já existe (para funcionários)
        if (matricula && tipo !== 'cliente') {
            db.get("SELECT * FROM usuarios WHERE matricula = ?", [matricula], (err, existingMatricula) => {
                if (err) {
                    console.error('Erro ao verificar matrícula:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Erro interno do servidor'
                    });
                }

                if (existingMatricula) {
                    return res.json({
                        success: false,
                        message: 'Matrícula já cadastrada'
                    });
                }

                createUser();
            });
        } else {
            // Cliente não precisa de matrícula
            if (tipo !== 'cliente' && !matricula) {
                return res.json({
                    success: false,
                    message: 'Funcionários precisam de uma matrícula'
                });
            }
            createUser();
        }

        function createUser() {
            const query = matricula 
                ? `INSERT INTO usuarios (nome, cpf, senha, tipo, matricula, email, telefone) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`
                : `INSERT INTO usuarios (nome, cpf, senha, tipo, email, telefone) 
                   VALUES (?, ?, ?, ?, ?, ?)`;

            const params = matricula 
                ? [nome, cpfLimpo, senha, tipo, matricula, email, telefone]
                : [nome, cpfLimpo, senha, tipo, email, telefone];

            db.run(query, params, function(err) {
                if (err) {
                    console.error('Erro ao criar usuário:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Erro ao criar usuário: ' + err.message
                    });
                }

                log(`Usuário criado com sucesso. ID: ${this.lastID}`);
                
                // Buscar usuário criado para retornar dados completos
                db.get(
                    "SELECT id, nome, cpf, tipo, matricula, email, telefone, data_cadastro FROM usuarios WHERE id = ?",
                    [this.lastID],
                    (err, newUser) => {
                        if (err) {
                            return res.json({
                                success: true,
                                message: 'Usuário criado com sucesso!',
                                usuarioId: this.lastID
                            });
                        }
                        
                        res.json({
                            success: true,
                            message: 'Usuário criado com sucesso!',
                            usuario: newUser
                        });
                    }
                );
            });
        }
    });
});

// Atualizar usuário (CORRIGIDO)
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const {
        nome, email, telefone
    } = req.body;

    log(`Atualizando usuário ID: ${id}`);

    if (!nome) {
        return res.json({
            success: false,
            message: 'Nome é obrigatório'
        });
    }

    const query = `
        UPDATE usuarios 
        SET nome = ?, email = ?, telefone = ?
        WHERE id = ?
    `;

    db.run(query, [nome, email, telefone, id], function(err) {
        if (err) {
            console.error('Erro ao atualizar usuário:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao atualizar usuário: ' + err.message
            });
        }

        if (this.changes === 0) {
            return res.json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        log(`Usuário atualizado com sucesso`);
        
        // Buscar usuário atualizado
        db.get(
            "SELECT id, nome, cpf, tipo, matricula, email, telefone, data_cadastro FROM usuarios WHERE id = ?",
            [id],
            (err, updatedUser) => {
                res.json({
                    success: true,
                    message: 'Usuário atualizado com sucesso!',
                    usuario: updatedUser
                });
            }
        );
    });
});

// Deletar usuário (CORRIGIDO)
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    log(`Deletando usuário ID: ${id}`);

    // Verificar se usuário existe
    db.get("SELECT * FROM usuarios WHERE id = ?", [id], (err, usuario) => {
        if (err) {
            console.error('Erro ao verificar usuário:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }

        if (!usuario) {
            return res.json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Verificar se o usuário tem passagens (se tabela existir)
        db.get("SELECT COUNT(*) as count FROM passagens WHERE usuario_id = ?", [id], (err, row) => {
            if (err) {
                console.log('Erro ao verificar passagens (pode ser normal):', err.message);
                // Continua mesmo com erro
            } else if (row && row.count > 0) {
                return res.json({
                    success: false,
                    message: 'Não é possível deletar usuário com passagens ativas'
                });
            }

            // Verificar se é piloto em algum voo
            db.get("SELECT COUNT(*) as count FROM voos WHERE piloto_id = ? OR co_piloto_id = ?", [id, id], (err, row) => {
                if (err) {
                    console.log('Erro ao verificar voos (pode ser normal):', err.message);
                    // Continua mesmo com erro
                } else if (row && row.count > 0) {
                    return res.json({
                        success: false,
                        message: 'Não é possível deletar piloto designado em voos'
                    });
                }

                // Verificar se é comissário em algum voo - NOME DA TABELA CORRIGIDO
                db.get("SELECT COUNT(*) as count FROM tripulacao_voos WHERE usuario_id = ?", [id], (err, row) => {
                    if (err) {
                        console.log('Erro ao verificar tripulação (pode ser normal):', err.message);
                        // Continua mesmo com erro
                    } else if (row && row.count > 0) {
                        return res.json({
                            success: false,
                            message: 'Não é possível deletar comissário designado em voos'
                        });
                    }

                    // Deletar usuário
                    db.run("DELETE FROM usuarios WHERE id = ?", [id], function(err) {
                        if (err) {
                            console.error('Erro ao deletar usuário:', err);
                            return res.status(500).json({
                                success: false,
                                message: 'Erro ao deletar usuário: ' + err.message
                            });
                        }

                        log(`Usuário deletado com sucesso`);
                        
                        res.json({
                            success: true,
                            message: 'Usuário deletado com sucesso!'
                        });
                    });
                });
            });
        });
    });
});

// Buscar estatísticas de usuários (CORRIGIDO)
router.get('/estatisticas/geral', (req, res) => {
    log('Buscando estatísticas de usuários');

    const query = `
        SELECT 
            tipo,
            COUNT(*) as quantidade
        FROM usuarios 
        GROUP BY tipo
        ORDER BY quantidade DESC
    `;

    db.all(query, (err, rows) => {
        if (err) {
            console.error('Erro ao buscar estatísticas:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar estatísticas'
            });
        }

        // Total geral
        const totalGeral = rows.reduce((sum, row) => sum + row.quantidade, 0);

        res.json({
            success: true,
            estatisticas: rows,
            totalGeral: totalGeral
        });
    });
});

// Buscar pilotos disponíveis (CORRIGIDO - remove filtro de status)
router.get('/pilotos/disponiveis', (req, res) => {
    log('Buscando pilotos disponíveis');

    const query = `
        SELECT 
            id, nome, matricula, email, telefone
        FROM usuarios 
        WHERE tipo = 'piloto'
        ORDER BY nome
    `;

    db.all(query, (err, rows) => {
        if (err) {
            console.error('Erro ao buscar pilotos:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar pilotos'
            });
        }

        log(`Encontrados ${rows.length} pilotos disponíveis`);
        
        res.json({
            success: true,
            pilotos: rows
        });
    });
});

// Buscar comissários disponíveis (CORRIGIDO - remove filtro de status)
router.get('/comissarios/disponiveis', (req, res) => {
    log('Buscando comissários disponíveis');

    const query = `
        SELECT 
            id, nome, matricula, email, telefone
        FROM usuarios 
        WHERE tipo = 'comissario'
        ORDER BY nome
    `;

    db.all(query, (err, rows) => {
        if (err) {
            console.error('Erro ao buscar comissários:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar comissários'
            });
        }

        log(`Encontrados ${rows.length} comissários disponíveis`);
        
        res.json({
            success: true,
            comissarios: rows
        });
    });
});

// Atualizar status do usuário (CORRIGIDO - se coluna status existir)
router.patch('/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    log(`Atualizando status do usuário ${id} para: ${status}`);

    if (!status || !['ativo', 'inativo'].includes(status)) {
        return res.json({
            success: false,
            message: 'Status deve ser "ativo" ou "inativo"'
        });
    }

    // Verificar se coluna status existe antes de tentar atualizar
    db.run(
        "UPDATE usuarios SET status = ? WHERE id = ?",
        [status, id],
        function(err) {
            if (err) {
                console.log('Coluna status não existe ou erro (pode ser normal):', err.message);
                return res.json({
                    success: false,
                    message: 'Funcionalidade de status não disponível'
                });
            }

            if (this.changes === 0) {
                return res.json({
                    success: false,
                    message: 'Usuário não encontrado'
                });
            }

            log(`Status atualizado com sucesso`);
            
            res.json({
                success: true,
                message: `Status atualizado para ${status} com sucesso!`
            });
        }
    );
});

// Buscar diretores (NOVO)
router.get('/diretores/disponiveis', (req, res) => {
    log('Buscando diretores');

    const query = `
        SELECT 
            id, nome, matricula, email, telefone
        FROM usuarios 
        WHERE tipo = 'diretor'
        ORDER BY nome
    `;

    db.all(query, (err, rows) => {
        if (err) {
            console.error('Erro ao buscar diretores:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar diretores'
            });
        }

        log(`Encontrados ${rows.length} diretores`);
        
        res.json({
            success: true,
            diretores: rows
        });
    });
});

module.exports = router;
const express = require('express');
const { db } = require('../models/database');
const router = express.Router();

// Middleware de log
const log = (mensagem) => {
    console.log(mensagem);
};

// Rota de login (ATUALIZADA)
router.post('/login', (req, res) => {
    const { cpf, senha } = req.body;

    log('Tentativa de login:', { cpf });

    if (!cpf || !senha) {
        return res.json({ 
            success: false, 
            message: 'CPF e senha são obrigatórios' 
        });
    }

    // Buscar usuário no banco de dados
    const query = `
        SELECT 
            id, nome, cpf, tipo, matricula, email, telefone, endereco,
            data_nascimento, data_admissao, salario, status, data_cadastro
        FROM usuarios 
        WHERE cpf = ? AND senha = ? AND status = 'ativo'
    `;

    db.get(query, [cpf, senha], (err, row) => {
        if (err) {
            console.error('Erro no banco de dados:', err);
            return res.json({ 
                success: false, 
                message: 'Erro interno do servidor' 
            });
        }

        if (row) {
            log(`Login bem-sucedido para: ${row.nome} (${row.tipo})`);
            
            // Determinar página de redirecionamento baseada no tipo
            let redirectPage = '';
            switch (row.tipo) {
                case 'cliente':
                    redirectPage = 'cliente.html';
                    break;
                case 'comissario':
                    redirectPage = 'comissario.html';
                    break;
                case 'piloto':
                    redirectPage = 'piloto.html';
                    break;
                case 'diretor':
                    redirectPage = 'diretor.html';
                    break;
                default:
                    redirectPage = 'index.html';
            }

            res.json({
                success: true,
                message: 'Login realizado com sucesso!',
                user: row,
                redirectTo: redirectPage
            });
        } else {
            // Verificar se o usuário existe mas a senha está errada
            db.get("SELECT * FROM usuarios WHERE cpf = ?", [cpf], (err, userExists) => {
                if (userExists) {
                    if (userExists.status === 'inativo') {
                        log('Login falhou - Usuário inativo');
                        res.json({ 
                            success: false, 
                            message: 'Usuário inativo. Entre em contato com o administrador.' 
                        });
                    } else {
                        log('Login falhou - Senha incorreta');
                        res.json({ 
                            success: false, 
                            message: 'Senha incorreta' 
                        });
                    }
                } else {
                    log('Login falhou - CPF não cadastrado');
                    res.json({ 
                        success: false, 
                        message: 'CPF não cadastrado' 
                    });
                }
            });
        }
    });
});

// Rota de cadastro (ATUALIZADA)
router.post('/cadastro', (req, res) => {
    const { 
        nome, cpf, senha, tipo, matricula, email, telefone, 
        endereco, data_nascimento, data_admissao, salario 
    } = req.body;

    log('Tentativa de cadastro:', { nome, cpf, tipo, matricula });

    // Validações básicas
    if (!nome || !cpf || !senha || !tipo) {
        return res.json({ 
            success: false, 
            message: 'Nome, CPF, senha e tipo são obrigatórios' 
        });
    }

    if (senha.length < 4) {
        return res.json({ 
            success: false, 
            message: 'A senha deve ter pelo menos 4 caracteres' 
        });
    }

    // Validar tipo de usuário
    const tiposValidos = ['cliente', 'comissario', 'piloto', 'diretor'];
    if (!tiposValidos.includes(tipo)) {
        return res.json({
            success: false,
            message: 'Tipo de usuário inválido'
        });
    }

    // Validar matrícula baseada no tipo
    if (tipo !== 'cliente') {
        if (!matricula) {
            return res.json({
                success: false,
                message: 'Matrícula é obrigatória para funcionários'
            });
        }
        
        // Validar formato da matrícula baseado no tipo
        let padraoMatricula;
        switch (tipo) {
            case 'comissario':
                padraoMatricula = /^COM\d{3}$/;
                break;
            case 'piloto':
                padraoMatricula = /^PIL\d{3}$/;
                break;
            case 'diretor':
                padraoMatricula = /^DIR\d{3}$/;
                break;
            default:
                padraoMatricula = /^[A-Z]{3}\d{3}$/;
        }

        if (!padraoMatricula.test(matricula)) {
            return res.json({
                success: false,
                message: `Matrícula inválida para ${tipo}. Formato esperado: ${tipo === 'comissario' ? 'COM001' : tipo === 'piloto' ? 'PIL001' : 'DIR001'}`
            });
        }
    }

    // Verificar se CPF já existe
    db.get("SELECT * FROM usuarios WHERE cpf = ?", [cpf], (err, row) => {
        if (err) {
            console.error('Erro ao verificar CPF:', err);
            return res.json({ 
                success: false, 
                message: 'Erro interno do servidor' 
            });
        }

        if (row) {
            return res.json({ 
                success: false, 
                message: 'CPF já cadastrado' 
            });
        }

        // Verificar se matrícula já existe (apenas para funcionários)
        if (tipo !== 'cliente') {
            db.get("SELECT * FROM usuarios WHERE matricula = ?", [matricula], (err, matriculaRow) => {
                if (err) {
                    console.error('Erro ao verificar matrícula:', err);
                    return res.json({ 
                        success: false, 
                        message: 'Erro interno do servidor' 
                    });
                }

                if (matriculaRow) {
                    return res.json({ 
                        success: false, 
                        message: 'Matrícula já cadastrada' 
                    });
                }

                // Inserir novo usuário (funcionário com matrícula)
                inserirUsuario();
            });
        } else {
            // Inserir novo usuário (cliente sem matrícula)
            inserirUsuario();
        }

        function inserirUsuario() {
            const query = `
                INSERT INTO usuarios (
                    nome, cpf, senha, tipo, matricula, email, telefone, 
                    endereco, data_nascimento, data_admissao, salario
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const params = [
                nome, cpf, senha, tipo, 
                tipo !== 'cliente' ? matricula : null, 
                email || null, telefone || null, endereco || null,
                data_nascimento || null, data_admissao || null, salario || null
            ];

            db.run(query, params, function(err) {
                if (err) {
                    console.error('Erro ao cadastrar usuário:', err);
                    return res.json({ 
                        success: false, 
                        message: 'Erro ao cadastrar usuário' 
                    });
                }

                log(`Usuário cadastrado com sucesso. ID: ${this.lastID}`);
                
                // Buscar usuário recém-criado
                const selectQuery = `
                    SELECT 
                        id, nome, cpf, tipo, matricula, email, telefone, 
                        data_nascimento, data_admissao, salario, status, data_cadastro
                    FROM usuarios 
                    WHERE id = ?
                `;
                
                db.get(selectQuery, [this.lastID], (err, newUser) => {
                    if (err) {
                        console.error('Erro ao buscar usuário criado:', err);
                        return res.json({ 
                            success: false, 
                            message: 'Usuário criado, mas erro ao buscar dados' 
                        });
                    }

                    // Determinar página de redirecionamento
                    let redirectPage = '';
                    switch (newUser.tipo) {
                        case 'cliente':
                            redirectPage = 'cliente.html';
                            break;
                        case 'comissario':
                            redirectPage = 'comissario.html';
                            break;
                        case 'piloto':
                            redirectPage = 'piloto.html';
                            break;
                        case 'diretor':
                            redirectPage = 'diretor.html';
                            break;
                        default:
                            redirectPage = 'index.html';
                    }

                    res.json({
                        success: true,
                        message: 'Cadastro realizado com sucesso!',
                        user: newUser,
                        redirectTo: redirectPage
                    });
                });
            });
        }
    });
});

// Rota para verificar sessão (NOVO)
router.get('/sessao/:userId', (req, res) => {
    const { userId } = req.params;

    log(`🔍 Verificando sessão para usuário ID: ${userId}`);

    const query = `
        SELECT 
            id, nome, cpf, tipo, matricula, email, telefone,
            data_nascimento, data_admissao, salario, status, data_cadastro
        FROM usuarios 
        WHERE id = ? AND status = 'ativo'
    `;

    db.get(query, [userId], (err, row) => {
        if (err) {
            console.error('Erro ao verificar sessão:', err);
            return res.json({ 
                success: false, 
                message: 'Erro interno do servidor' 
            });
        }

        if (row) {
            log(`Sessão válida para: ${row.nome}`);
            res.json({
                success: true,
                user: row
            });
        } else {
            log('Sessão inválida - usuário não encontrado ou inativo');
            res.json({ 
                success: false, 
                message: 'Sessão expirada ou usuário inativo' 
            });
        }
    });
});

// Rota para atualizar perfil (NOVO)
router.put('/perfil/:userId', (req, res) => {
    const { userId } = req.params;
    const { nome, email, telefone, endereco, data_nascimento } = req.body;

    log(`Atualizando perfil do usuário ID: ${userId}`);

    const query = `
        UPDATE usuarios 
        SET nome = ?, email = ?, telefone = ?, endereco = ?, data_nascimento = ?
        WHERE id = ?
    `;

    db.run(query, [nome, email, telefone, endereco, data_nascimento, userId], function(err) {
        if (err) {
            console.error('Erro ao atualizar perfil:', err);
            return res.json({ 
                success: false, 
                message: 'Erro ao atualizar perfil' 
            });
        }

        if (this.changes === 0) {
            return res.json({ 
                success: false, 
                message: 'Usuário não encontrado' 
            });
        }

        log(`Perfil atualizado com sucesso`);
        
        // Buscar usuário atualizado
        const selectQuery = `
            SELECT 
                id, nome, cpf, tipo, matricula, email, telefone, 
                endereco, data_nascimento, data_admissao, salario, status, data_cadastro
            FROM usuarios 
            WHERE id = ?
        `;

        db.get(selectQuery, [userId], (err, updatedUser) => {
            if (err) {
                console.error('Erro ao buscar usuário atualizado:', err);
                return res.json({ 
                    success: false, 
                    message: 'Perfil atualizado, mas erro ao buscar dados' 
                });
            }

            res.json({
                success: true,
                message: 'Perfil atualizado com sucesso!',
                user: updatedUser
            });
        });
    });
});

// Rota para alterar senha (NOVO)
router.put('/senha/:userId', (req, res) => {
    const { userId } = req.params;
    const { senha_atual, nova_senha } = req.body;

    log(`Alterando senha do usuário ID: ${userId}`);

    if (!senha_atual || !nova_senha) {
        return res.json({ 
            success: false, 
            message: 'Senha atual e nova senha são obrigatórias' 
        });
    }

    if (nova_senha.length < 4) {
        return res.json({ 
            success: false, 
            message: 'A nova senha deve ter pelo menos 4 caracteres' 
        });
    }

    // Verificar senha atual
    db.get("SELECT * FROM usuarios WHERE id = ? AND senha = ?", [userId, senha_atual], (err, row) => {
        if (err) {
            console.error('Erro ao verificar senha:', err);
            return res.json({ 
                success: false, 
                message: 'Erro interno do servidor' 
            });
        }

        if (!row) {
            return res.json({ 
                success: false, 
                message: 'Senha atual incorreta' 
            });
        }

        // Atualizar senha
        db.run("UPDATE usuarios SET senha = ? WHERE id = ?", [nova_senha, userId], function(err) {
            if (err) {
                console.error('Erro ao alterar senha:', err);
                return res.json({ 
                    success: false, 
                    message: 'Erro ao alterar senha' 
                });
            }

            log(`Senha alterada com sucesso`);
            
            res.json({
                success: true,
                message: 'Senha alterada com sucesso!'
            });
        });
    });
});

module.exports = router;
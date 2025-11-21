const express = require('express');
const { db } = require('../models/database');
const router = express.Router();

// Middleware de log
const log = (mensagem) => {
    console.log(mensagem);
};

// Rota de login
router.post('/login', (req, res) => {
    const { cpf, senha } = req.body;
    const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : '';

    log('📥 Tentativa de login:', { cpf: cpfLimpo });

    if (!cpfLimpo || !senha) {
        return res.json({ 
            success: false, 
            message: 'CPF e senha são obrigatórios' 
        });
    }

    const query = `
        SELECT * FROM usuarios 
        WHERE cpf = ? AND senha = ? AND status = 'ativo'
    `;

    db.get(query, [cpfLimpo, senha], (err, row) => {
        if (err) {
            console.error('❌ Erro no banco de dados:', err);
            return res.json({ 
                success: false, 
                message: 'Erro interno do servidor' 
            });
        }

        if (row) {
            log(`✅ Login bem-sucedido para: ${row.nome} (${row.tipo})`);
            
            let redirectPage = '';
            switch (row.tipo) {
                case 'cliente':
                    redirectPage = '/cliente';
                    break;
                case 'comissario':
                    redirectPage = '/comissario';
                    break;
                case 'piloto':
                    redirectPage = '/piloto';
                    break;
                case 'diretor':
                    redirectPage = '/diretor';
                    break;
                default:
                    redirectPage = '/';
            }

            // Remover a senha da resposta
            const { senha, ...usuarioSemSenha } = row;

            res.json({
                success: true,
                message: 'Login realizado com sucesso!',
                usuario: usuarioSemSenha,
                redirectTo: redirectPage
            });
        } else {
            db.get("SELECT * FROM usuarios WHERE cpf = ?", [cpfLimpo], (err, userExists) => {
                if (err) {
                    console.error('❌ Erro ao verificar usuário:', err);
                    return res.json({ 
                        success: false, 
                        message: 'Erro interno do servidor' 
                    });
                }

                if (userExists) {
                    if (userExists.status === 'inativo') {
                        log('❌ Login falhou - Usuário inativo');
                        res.json({ 
                            success: false, 
                            message: 'Usuário inativo. Entre em contato com o administrador.' 
                        });
                    } else {
                        log('❌ Login falhou - Senha incorreta');
                        res.json({ 
                            success: false, 
                            message: 'Senha incorreta' 
                        });
                    }
                } else {
                    log('❌ Login falhou - CPF não cadastrado');
                    res.json({ 
                        success: false, 
                        message: 'CPF não cadastrado' 
                    });
                }
            });
        }
    });
});

// Rota de cadastro
router.post('/cadastro', (req, res) => {
    const { 
        nome, cpf, senha, tipo, matricula, email, telefone, 
        endereco, data_nascimento, data_admissao, salario 
    } = req.body;
    
    const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : '';

    log('📝 Tentativa de cadastro:', { nome, cpf: cpfLimpo, tipo, matricula });

    // Validações
    if (!nome || !cpfLimpo || !senha || !tipo) {
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
    
    if (cpfLimpo.length !== 11) {
        return res.json({
            success: false,
            message: 'CPF inválido - deve conter 11 dígitos'
        });
    }
    
    // Validação de tipo de usuário
    const tiposValidos = ['cliente', 'comissario', 'piloto', 'diretor'];
    if (!tiposValidos.includes(tipo)) {
        return res.json({
            success: false,
            message: 'Tipo de usuário inválido'
        });
    }

    db.get("SELECT * FROM usuarios WHERE cpf = ?", [cpfLimpo], (err, row) => {
        if (err) {
            console.error('❌ Erro ao verificar CPF:', err);
            return res.json({ success: false, message: 'Erro interno do servidor' });
        }
        
        if (row) {
            return res.json({ success: false, message: 'CPF já cadastrado' });
        }

        // Inserir novo usuário
        const query = `
            INSERT INTO usuarios (
                nome, cpf, senha, tipo, matricula, email, telefone, 
                endereco, data_nascimento, data_admissao, salario
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            nome, 
            cpfLimpo, 
            senha, 
            tipo, 
            (tipo !== 'cliente' ? matricula : null), 
            email || null, 
            telefone || null, 
            endereco || null,
            data_nascimento || null, 
            data_admissao || null, 
            salario || null
        ];

        db.run(query, params, function(err) {
            if (err) {
                console.error('❌ Erro ao cadastrar usuário:', err);
                return res.json({ 
                    success: false, 
                    message: 'Erro ao cadastrar usuário: ' + err.message 
                });
            }

            log(`✅ Usuário cadastrado com sucesso. ID: ${this.lastID}`);
            
            // Buscar usuário criado para retornar dados completos
            db.get("SELECT * FROM usuarios WHERE id = ?", [this.lastID], (err, newUser) => {
                if (err) {
                    console.error('❌ Erro ao buscar usuário criado:', err);
                    // Retorna sucesso mesmo sem dados completos
                    return res.json({
                        success: true,
                        message: 'Cadastro realizado com sucesso!',
                        usuario: {
                            id: this.lastID,
                            nome: nome,
                            cpf: cpfLimpo,
                            tipo: tipo
                        }
                    });
                }

                let redirectPage = '';
                switch (newUser.tipo) {
                    case 'cliente': 
                        redirectPage = '/cliente'; 
                        break;
                    case 'comissario': 
                        redirectPage = '/comissario'; 
                        break;
                    case 'piloto': 
                        redirectPage = '/piloto'; 
                        break;
                    case 'diretor': 
                        redirectPage = '/diretor'; 
                        break;
                    default: 
                        redirectPage = '/';
                }

                // Remover senha da resposta
                const { senha, ...usuarioSemSenha } = newUser;

                res.json({
                    success: true,
                    message: 'Cadastro realizado com sucesso!',
                    usuario: usuarioSemSenha,
                    redirectTo: redirectPage
                });
            });
        });
    });
});

// Rota para verificar sessão
router.get('/sessao/:userId', (req, res) => {
    const { userId } = req.params;
    log(`🔍 Verificando sessão para usuário ID: ${userId}`);

    const query = `
        SELECT id, nome, cpf, tipo, email, telefone, endereco, data_nascimento, data_cadastro, status
        FROM usuarios 
        WHERE id = ? AND status = 'ativo'
    `;

    db.get(query, [userId], (err, row) => {
        if (err) {
            console.error('❌ Erro ao verificar sessão:', err);
            return res.json({ 
                success: false, 
                message: 'Erro interno do servidor' 
            });
        }
        
        if (row) {
            res.json({
                success: true,
                usuario: row
            });
        } else {
            res.json({ 
                success: false, 
                message: 'Sessão expirada ou usuário inativo' 
            });
        }
    });
});

// Rota para atualizar perfil
router.put('/perfil/:userId', (req, res) => {
    const { userId } = req.params;
    const { nome, email, telefone, endereco, data_nascimento } = req.body;

    log(`✏️ Atualizando perfil do usuário ID: ${userId}`);

    if (!nome) {
        return res.json({
            success: false,
            message: 'Nome é obrigatório'
        });
    }

    const query = `
        UPDATE usuarios 
        SET nome = ?, email = ?, telefone = ?, endereco = ?, data_nascimento = ?
        WHERE id = ?
    `;

    db.run(query, [nome, email, telefone, endereco, data_nascimento, userId], function(err) {
        if (err) {
            console.error('❌ Erro ao atualizar perfil:', err);
            return res.json({
                success: false,
                message: 'Erro ao atualizar perfil: ' + err.message
            });
        }

        if (this.changes === 0) {
            return res.json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        log(`✅ Perfil atualizado para usuário ID: ${userId}`);
        
        // Buscar usuário atualizado
        db.get("SELECT id, nome, cpf, tipo, email, telefone, endereco, data_nascimento, data_cadastro FROM usuarios WHERE id = ?", [userId], (err, user) => {
            if (err) {
                console.error('❌ Erro ao buscar usuário atualizado:', err);
                return res.json({
                    success: true,
                    message: 'Perfil atualizado com sucesso!'
                });
            }

            res.json({
                success: true,
                message: 'Perfil atualizado com sucesso!',
                usuario: user
            });
        });
    });
});

// Rota para alterar senha
router.put('/senha/:userId', (req, res) => {
    const { userId } = req.params;
    const { senhaAtual, novaSenha } = req.body;

    log(`🔐 Alterando senha para usuário ID: ${userId}`);

    if (!senhaAtual || !novaSenha) {
        return res.json({
            success: false,
            message: 'Senha atual e nova senha são obrigatórias'
        });
    }

    if (novaSenha.length < 4) {
        return res.json({
            success: false,
            message: 'A nova senha deve ter pelo menos 4 caracteres'
        });
    }

    // Primeiro verificar se a senha atual está correta
    db.get("SELECT * FROM usuarios WHERE id = ? AND senha = ?", [userId, senhaAtual], (err, user) => {
        if (err) {
            console.error('❌ Erro ao verificar senha:', err);
            return res.json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }

        if (!user) {
            return res.json({
                success: false,
                message: 'Senha atual incorreta'
            });
        }

        // Atualizar senha
        db.run("UPDATE usuarios SET senha = ? WHERE id = ?", [novaSenha, userId], function(err) {
            if (err) {
                console.error('❌ Erro ao alterar senha:', err);
                return res.json({
                    success: false,
                    message: 'Erro ao alterar senha: ' + err.message
                });
            }

            log(`✅ Senha alterada para usuário ID: ${userId}`);
            
            res.json({
                success: true,
                message: 'Senha alterada com sucesso!'
            });
        });
    });
});

// Rota para listar usuários (apenas para administradores)
router.get('/usuarios', (req, res) => {
    log('👥 Listando todos os usuários');

    const query = `
        SELECT id, nome, cpf, tipo, email, telefone, data_cadastro, status
        FROM usuarios 
        ORDER BY nome
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('❌ Erro ao listar usuários:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }

        res.json({
            success: true,
            usuarios: rows,
            total: rows.length
        });
    });
});

module.exports = router;
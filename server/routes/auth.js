// server/routes/auth.js
const express = require('express');
const { db } = require('../models/database'); // Importa o 'db' desestruturado
const router = express.Router();

// Middleware de log
const log = (mensagem) => {
    console.log(mensagem);
};

// Rota de login
router.post('/login', (req, res) => {
    const { cpf, senha } = req.body;
    const cpfLimpo = cpf.replace(/\D/g, ''); // Limpa o CPF

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
                    redirectPage = '/cliente'; // Rota relativa
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
                usuario: usuarioSemSenha, // Envia 'usuario'
                redirectTo: redirectPage
            });
        } else {
            db.get("SELECT * FROM usuarios WHERE cpf = ?", [cpfLimpo], (err, userExists) => {
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
    
    const cpfLimpo = cpf.replace(/\D/g, '');

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
            nome, cpfLimpo, senha, tipo, 
            (tipo !== 'cliente' ? matricula : null), 
            email || null, telefone || null, endereco || null,
            data_nascimento || null, data_admissao || null, salario || null
        ];

        db.run(query, params, function(err) {
            if (err) {
                console.error('❌ Erro ao cadastrar usuário:', err);
                return res.json({ success: false, message: 'Erro ao cadastrar usuário' });
            }

            log(`✅ Usuário cadastrado com sucesso. ID: ${this.lastID}`);
            
            db.get("SELECT * FROM usuarios WHERE id = ?", [this.lastID], (err, newUser) => {
                if (err) {
                    return res.json({ success: false, message: 'Usuário criado, mas erro ao buscar dados' });
                }

                let redirectPage = '';
                switch (newUser.tipo) {
                    case 'cliente': redirectPage = '/cliente'; break;
                    case 'comissario': redirectPage = '/comissario'; break;
                    case 'piloto': redirectPage = '/piloto'; break;
                    case 'diretor': redirectPage = '/diretor'; break;
                    default: redirectPage = '/';
                }

                const { senha, ...usuarioSemSenha } = newUser;

                res.json({
                    success: true,
                    message: 'Cadastro realizado com sucesso!',
                    usuario: usuarioSemSenha, // Envia 'usuario'
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
        SELECT * FROM usuarios 
        WHERE id = ? AND status = 'ativo'
    `;

    db.get(query, [userId], (err, row) => {
        if (err) {
            return res.json({ success: false, message: 'Erro interno do servidor' });
        }
        if (row) {
            const { senha, ...usuarioSemSenha } = row;
            res.json({
                success: true,
                usuario: usuarioSemSenha // Envia 'usuario'
            });
        } else {
            res.json({ success: false, message: 'Sessão expirada ou usuário inativo' });
        }
    });
});

// Rota para atualizar perfil
router.put('/perfil/:userId', (req, res) => {
    // ... (Lógica de atualização de perfil) ...
    res.json({ success: true, message: 'Perfil atualizado (simulado)' });
});

// Rota para alterar senha
router.put('/senha/:userId', (req, res) => {
    // ... (Lógica de alteração de senha) ...
    res.json({ success: true, message: 'Senha alterada (simulado)' });
});

module.exports = router;
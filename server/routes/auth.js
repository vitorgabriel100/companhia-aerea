const express = require('express');
const { db } = require('../models/database');
const router = express.Router();

// Middleware de log
const log = (mensagem) => {
    console.log(mensagem);
};

// Rota de login - VERSÃO CORRIGIDA COM DEBUG
router.post('/login', (req, res) => {
    const { cpf, senha } = req.body;
    const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : '';

    console.log('🚨 ========== TENTATIVA DE LOGIN ==========');
    console.log('📥 CPF recebido:', cpf, '-> Limpo:', cpfLimpo);
    console.log('🔐 Senha recebida:', senha ? '***' + senha.length + ' chars' : 'vazia');

    if (!cpfLimpo || !senha) {
        console.log('❌ FALHA: CPF ou senha vazios');
        return res.json({ 
            success: false, 
            message: 'CPF e senha são obrigatórios' 
        });
    }

    // Primeiro: verificar se o usuário existe com este CPF
    console.log('🔍 Buscando usuário pelo CPF...');
    db.get("SELECT * FROM usuarios WHERE cpf = ?", [cpfLimpo], (err, user) => {
        if (err) {
            console.error('❌ ERRO no banco de dados:', err);
            return res.json({ 
                success: false, 
                message: 'Erro interno do servidor' 
            });
        }

        console.log('📋 Usuário encontrado:', user ? `Sim (${user.nome})` : 'Não');
        
        if (user) {
            console.log('👤 Detalhes do usuário:');
            console.log('   ID:', user.id);
            console.log('   Nome:', user.nome);
            console.log('   Tipo:', user.tipo);
            console.log('   Status:', user.status);
            console.log('   Senha no banco:', user.senha ? '***' + user.senha.length + ' chars' : 'vazia');
            console.log('   Senha recebida:', senha ? '***' + senha.length + ' chars' : 'vazia');

            // Agora verificar se a senha está correta
            if (user.senha === senha) {
                if (user.status === 'inativo') {
                    console.log('❌ FALHA: Usuário inativo');
                    return res.json({ 
                        success: false, 
                        message: 'Usuário inativo. Entre em contato com o administrador.' 
                    });
                }

                console.log('✅ SENHA CORRETA - Login bem-sucedido');
                
                let redirectPage = '';
                switch (user.tipo) {
                    case 'cliente': redirectPage = '/cliente'; break;
                    case 'comissario': redirectPage = '/comissario'; break;
                    case 'piloto': redirectPage = '/piloto'; break;
                    case 'diretor': redirectPage = '/diretor'; break;
                    default: redirectPage = '/';
                }

                // Remover a senha da resposta
                const { senha, ...usuarioSemSenha } = user;

                res.json({
                    success: true,
                    message: 'Login realizado com sucesso!',
                    usuario: usuarioSemSenha,
                    redirectTo: redirectPage
                });
            } else {
                console.log('❌ FALHA: Senha incorreta');
                console.log('   Esperada:', user.senha);
                console.log('   Recebida:', senha);
                res.json({ 
                    success: false, 
                    message: 'Senha incorreta' 
                });
            }
        } else {
            console.log('❌ FALHA: CPF não cadastrado');
            res.json({ 
                success: false, 
                message: 'CPF não cadastrado' 
            });
        }
    });
});

// Rota de cadastro - VERSÃO CORRIGIDA COM DEBUG COMPLETO
router.post('/cadastro', (req, res) => {
    console.log('🚨 ========== ROTA CADASTRO CHAMADA ==========');
    console.log('📥 Dados recebidos no backend:', JSON.stringify(req.body, null, 2));
    
    const { 
        nome, cpf, senha, tipo, matricula, email, telefone, 
        endereco, data_nascimento, data_admissao, salario 
    } = req.body;
    
    const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : '';

    console.log('🔍 Dados processados:');
    console.log('   Nome:', nome);
    console.log('   CPF:', cpf, '->', cpfLimpo);
    console.log('   Senha:', senha ? '***' + senha.length + ' chars' : 'vazia');
    console.log('   Tipo:', tipo);
    console.log('   Matricula:', matricula);

    // Validações
    if (!nome || !cpfLimpo || !senha || !tipo) {
        console.log('❌ FALHA: Campos obrigatórios faltando');
        return res.json({ 
            success: false, 
            message: 'Nome, CPF, senha e tipo são obrigatórios' 
        });
    }
    
    if (senha.length < 4) {
        console.log('❌ FALHA: Senha muito curta');
        return res.json({ 
            success: false, 
            message: 'A senha deve ter pelo menos 4 caracteres' 
        });
    }
    
    if (cpfLimpo.length !== 11) {
        console.log('❌ FALHA: CPF inválido');
        return res.json({
            success: false,
            message: 'CPF inválido - deve conter 11 dígitos'
        });
    }
    
    // Validação de tipo de usuário
    const tiposValidos = ['cliente', 'comissario', 'piloto', 'diretor'];
    if (!tiposValidos.includes(tipo)) {
        console.log('❌ FALHA: Tipo de usuário inválido');
        return res.json({
            success: false,
            message: 'Tipo de usuário inválido'
        });
    }

    console.log('🔍 Verificando se CPF já existe no banco...');
    db.get("SELECT * FROM usuarios WHERE cpf = ?", [cpfLimpo], (err, row) => {
        if (err) {
            console.error('❌ ERRO CRÍTICO na consulta do CPF:', err);
            console.error('   Detalhes:', err.message);
            return res.json({ success: false, message: 'Erro interno do servidor' });
        }
        
        console.log('📋 CPF já existe?:', row ? 'SIM' : 'NÃO');
        if (row) {
            console.log('   CPF existente pertence a:', row.nome);
            return res.json({ success: false, message: 'CPF já cadastrado' });
        }

        console.log('✅ CPF disponível, preparando INSERT...');

        // Inserir novo usuário
        const query = `
            INSERT INTO usuarios (
                nome, cpf, senha, tipo, matricula, email, telefone, 
                endereco, data_nascimento, data_admissao, salario, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo')
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

        console.log('📤 Executando INSERT:');
        console.log('   Query:', query);
        console.log('   Params:', params);

        db.run(query, params, function(err) {
            if (err) {
                console.error('❌ ERRO CRÍTICO na inserção:', err);
                console.error('   Detalhes:', err.message);
                return res.json({ 
                    success: false, 
                    message: 'Erro ao cadastrar usuário: ' + err.message 
                });
            }

            console.log('✅ INSERT EXECUTADO COM SUCESSO!');
            console.log('   ID do novo usuário:', this.lastID);
            console.log('   Linhas afetadas:', this.changes);

            // Buscar usuário criado
            console.log('🔍 Buscando usuário criado...');
            db.get("SELECT * FROM usuarios WHERE id = ?", [this.lastID], (err, newUser) => {
                if (err) {
                    console.error('❌ ERRO ao buscar usuário criado:', err);
                    console.log('⚠️  Retornando dados básicos...');
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

                console.log('📋 USUÁRIO CRIADO NO BANCO:');
                console.log('   ID:', newUser.id);
                console.log('   Nome:', newUser.nome);
                console.log('   CPF:', newUser.cpf);
                console.log('   Tipo:', newUser.tipo);
                console.log('   Status:', newUser.status);

                let redirectPage = '';
                switch (newUser.tipo) {
                    case 'cliente': redirectPage = '/cliente'; break;
                    case 'comissario': redirectPage = '/comissario'; break;
                    case 'piloto': redirectPage = '/piloto'; break;
                    case 'diretor': redirectPage = '/diretor'; break;
                    default: redirectPage = '/';
                }

                // Remover senha da resposta
                const { senha, ...usuarioSemSenha } = newUser;

                console.log('🎯 Retornando sucesso para frontend');
                console.log('========================================');

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
    console.log('🔍 Verificando sessão para usuário ID:', userId);

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
            console.log('✅ Sessão válida para:', row.nome);
            res.json({
                success: true,
                usuario: row
            });
        } else {
            console.log('❌ Sessão inválida ou usuário inativo');
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

    console.log('✏️ Atualizando perfil do usuário ID:', userId);

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
            console.log('❌ Usuário não encontrado para atualização');
            return res.json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        console.log('✅ Perfil atualizado para usuário ID:', userId);
        
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

    console.log('🔐 Alterando senha para usuário ID:', userId);

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
            console.log('❌ Senha atual incorreta para usuário ID:', userId);
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

            console.log('✅ Senha alterada para usuário ID:', userId);
            
            res.json({
                success: true,
                message: 'Senha alterada com sucesso!'
            });
        });
    });
});

// Rota para listar usuários (apenas para administradores)
router.get('/usuarios', (req, res) => {
    console.log('👥 Listando todos os usuários');

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

        console.log(`✅ Encontrados ${rows.length} usuários`);
        res.json({
            success: true,
            usuarios: rows,
            total: rows.length
        });
    });
});

module.exports = router;
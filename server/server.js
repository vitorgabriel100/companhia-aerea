const express = require('express');
const cors = require('cors');
const path = require('path');
// ✅ CORREÇÃO: Importar 'db' por desestruturação
const { db } = require('./models/database'); 

// Inicializar app PRIMEIRO
const app = express();
const PORT = process.env.PORT || 9000;

// Middleware
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '..')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use('/scripts', express.static(path.join(__dirname, '../scripts')));

// Importar rotas
const authRoutes = require('./routes/auth');
const voosRoutes = require('./routes/voos');
const passagensRoutes = require('./routes/passagens');
const usuariosRoutes = require('./routes/usuarios');
const pagamentoRoutes = require('./routes/pagamento');
// ✅ NOVO: Importar a rota do piloto
const pilotoRoutes = require('./routes/piloto');

// Usar as rotas
app.use('/api/auth', authRoutes);
app.use('/api/voos', voosRoutes);
app.use('/api/passagens', passagensRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/pagamento', pagamentoRoutes);
// ✅ NOVO: Usar a rota do piloto
app.use('/api/piloto', pilotoRoutes);

// ✅ NOVAS ROTAS PARA SISTEMA DE ATRIBUIÇÃO DE VOOS

// Rota para atribuir voo ao piloto (Painel Administrativo)
app.post('/api/admin/atribuir-voo', async (req, res) => {
    console.log('🛫 Recebendo solicitação para atribuir voo:', req.body);
    
    try {
        const { vooId, pilotoCpf, dataVoo, origem, destino, aeronave, horarioPartida, horarioChegada } = req.body;
        
        // Validar dados obrigatórios
        if (!vooId || !pilotoCpf || !dataVoo || !origem || !destino) {
            return res.status(400).json({
                success: false,
                message: 'Todos os campos obrigatórios devem ser preenchidos: vooId, pilotoCpf, dataVoo, origem, destino'
            });
        }

        // Verificar se o piloto existe
        const piloto = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM usuarios WHERE cpf = ? AND tipo = 'piloto'", [pilotoCpf], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!piloto) {
            return res.status(404).json({
                success: false,
                message: 'Piloto não encontrado. Verifique o CPF informado.'
            });
        }

        // Verificar se já existe atribuição para este voo
        const vooExistente = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM voos_atribuidos WHERE voo_id = ?", [vooId], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (vooExistente) {
            return res.status(409).json({
                success: false,
                message: `Já existe uma atribuição para o voo ${vooId}`
            });
        }

        // Inserir a atribuição
        const query = `
            INSERT INTO voos_atribuidos 
            (voo_id, piloto_cpf, data_voo, origem, destino, aeronave, horario_partida, horario_chegada, status, data_atribuicao)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmado', datetime('now'))
        `;
        
        const params = [
            vooId, 
            pilotoCpf, 
            dataVoo, 
            origem, 
            destino, 
            aeronave || 'A320',
            horarioPartida || '08:00',
            horarioChegada || '09:30'
        ];

        const result = await new Promise((resolve, reject) => {
            db.run(query, params, function(err) {
                if (err) reject(err);
                resolve(this);
            });
        });

        console.log(`✅ Voo ${vooId} atribuído com sucesso ao piloto ${pilotoCpf}`);

        res.json({
            success: true,
            message: 'Voo atribuído com sucesso!',
            atribuicao: {
                id: result.lastID,
                vooId,
                pilotoCpf,
                pilotoNome: piloto.nome,
                dataVoo,
                origem,
                destino,
                aeronave: aeronave || 'A320',
                horarioPartida: horarioPartida || '08:00',
                horarioChegada: horarioChegada || '09:30',
                status: 'confirmado'
            }
        });

    } catch (error) {
        console.error('❌ Erro ao atribuir voo:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao atribuir voo'
        });
    }
});

// Rota para listar voos atribuídos (Painel Administrativo)
app.get('/api/admin/voos-atribuidos', async (req, res) => {
    try {
        const query = `
            SELECT va.*, u.nome as piloto_nome 
            FROM voos_atribuidos va 
            LEFT JOIN usuarios u ON va.piloto_cpf = u.cpf 
            ORDER BY va.data_voo, va.horario_partida
        `;

        const voosAtribuidos = await new Promise((resolve, reject) => {
            db.all(query, [], (err, rows) => {
                if (err) reject(err);
                resolve(rows || []);
            });
        });

        res.json({
            success: true,
            voos: voosAtribuidos
        });

    } catch (error) {
        console.error('❌ Erro ao buscar voos atribuídos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para o piloto ver seus voos atribuídos
app.get('/api/piloto/meus-voos/:cpf', async (req, res) => {
    try {
        const { cpf } = req.params;
        
        console.log(`🛫 Buscando voos para o piloto CPF: ${cpf}`);

        const query = `
            SELECT * FROM voos_atribuidos 
            WHERE piloto_cpf = ? 
            ORDER BY data_voo, horario_partida
        `;

        const meusVoos = await new Promise((resolve, reject) => {
            db.all(query, [cpf], (err, rows) => {
                if (err) reject(err);
                resolve(rows || []);
            });
        });

        console.log(`✅ Encontrados ${meusVoos.length} voos para o piloto ${cpf}`);

        res.json({
            success: true,
            voos: meusVoos
        });

    } catch (error) {
        console.error('❌ Erro ao buscar voos do piloto:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para buscar informações do piloto logado
app.get('/api/piloto/perfil/:cpf', async (req, res) => {
    try {
        const { cpf } = req.params;

        const query = `
            SELECT nome, cpf, email, matricula, tipo, data_criacao 
            FROM usuarios 
            WHERE cpf = ? AND tipo = 'piloto'
        `;

        const piloto = await new Promise((resolve, reject) => {
            db.get(query, [cpf], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!piloto) {
            return res.status(404).json({
                success: false,
                message: 'Piloto não encontrado'
            });
        }

        res.json({
            success: true,
            piloto: piloto
        });

    } catch (error) {
        console.error('❌ Erro ao buscar perfil do piloto:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota demo setup (mantida da versão anterior)
app.post('/api/demo/setup', async (req, res) => {
    console.log('🚀 Iniciando configuração de demonstração...');
    
    try {
        // ... (código anterior mantido igual)
        const usuariosDemo = [
            { nome: 'João Silva', cpf: '12345678900', senha: '1234', tipo: 'cliente', email: 'joao.silva@email.com' },
            { nome: 'Carlos Comissário', cpf: '11122233344', senha: '1234', tipo: 'comissario', matricula: 'COM001', email: 'carlos@companhiaaerea.com' },
            { nome: 'Ana Piloto', cpf: '55566677788', senha: '1234', tipo: 'piloto', matricula: 'PIL001', email: 'ana@companhiaaerea.com' },
            { nome: 'Pedro Diretor', cpf: '99988877766', senha: '1234', tipo: 'diretor', matricula: 'DIR001', email: 'pedro@companhiaaerea.com' },
            { nome: 'Maria Comissária', cpf: '44433322211', senha: '1234', tipo: 'comissario', matricula: 'COM002', email: 'maria@companhiaaerea.com' },
            { nome: 'Paulo Piloto', cpf: '77788899900', senha: '1234', tipo: 'piloto', matricula: 'PIL002', email: 'paulo@companhiaaerea.com' }
        ];

        const voosDemo = [
            {
                codigo: 'VG1001',
                origem: 'São Paulo (GRU)',
                destino: 'Rio de Janeiro (GIG)',
                data_partida: '2024-12-20',
                hora_partida: '08:00',
                data_chegada: '2024-12-20',
                hora_chegada: '09:30',
                preco_base: 299.99,
                assentos_disponiveis: 150,
                status: 'agendado',
                piloto_id: 3,
                co_piloto_id: 6
            },
            // ... (outros voos demo)
        ];

        let usuariosCriados = 0;
        let voosCriados = 0;

        // Inserir usuários de demo
        for (const usuario of usuariosDemo) {
            await new Promise((resolve, reject) => {
                db.get("SELECT * FROM usuarios WHERE cpf = ?", [usuario.cpf], (err, row) => {
                    if (err) return reject(err);

                    if (!row) {
                        const query = "INSERT INTO usuarios (nome, cpf, senha, tipo, matricula, email) VALUES (?, ?, ?, ?, ?, ?)";
                        const params = [usuario.nome, usuario.cpf, usuario.senha, usuario.tipo, usuario.matricula || null, usuario.email];
                        
                        db.run(query, params, function(err) {
                            if (err) return reject(err);
                            usuariosCriados++;
                            console.log(`✅ Usuário demo criado: ${usuario.nome}`);
                            resolve();
                        });
                    } else {
                        console.log(`ℹ️ Usuário já existe: ${usuario.nome}`);
                        resolve();
                    }
                });
            });
        }

        // Inserir voos de demo
        for (const voo of voosDemo) {
            await new Promise((resolve, reject) => {
                db.get("SELECT * FROM voos WHERE codigo = ?", [voo.codigo], (err, row) => {
                    if (err) return reject(err);

                    if (!row) {
                        db.run(
                            "INSERT INTO voos (codigo, origem, destino, data_partida, hora_partida, data_chegada, hora_chegada, preco_base, assentos_disponiveis, status, piloto_id, co_piloto_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                            [voo.codigo, voo.origem, voo.destino, voo.data_partida, voo.hora_partida, voo.data_chegada, voo.hora_chegada, voo.preco_base, voo.assentos_disponiveis, voo.status, voo.piloto_id, voo.co_piloto_id],
                            function(err) {
                                if (err) return reject(err);
                                voosCriados++;
                                console.log(`✅ Voo demo criado: ${voo.codigo}`);
                                resolve();
                            }
                        );
                    } else {
                        console.log(`ℹ️ Voo já existe: ${voo.codigo}`);
                        resolve();
                    }
                });
            });
        }

        // ✅ NOVO: Criar algumas atribuições de voo para demonstração
        console.log('🛫 Criando atribuições de voo para demonstração...');
        
        const atribuicoesDemo = [
            {
                vooId: 'VG1001',
                pilotoCpf: '55566677788', // Ana Piloto
                dataVoo: '2024-12-20',
                origem: 'São Paulo (GRU)',
                destino: 'Rio de Janeiro (GIG)',
                aeronave: 'A320',
                horarioPartida: '08:00',
                horarioChegada: '09:30'
            },
            {
                vooId: 'VG1002', 
                pilotoCpf: '77788899900', // Paulo Piloto
                dataVoo: '2024-12-20',
                origem: 'Rio de Janeiro (GIG)',
                destino: 'São Paulo (GRU)',
                aeronave: 'B737',
                horarioPartida: '11:00',
                horarioChegada: '12:30'
            }
        ];

        for (const atribuicao of atribuicoesDemo) {
            await new Promise((resolve, reject) => {
                const query = `
                    INSERT INTO voos_atribuidos 
                    (voo_id, piloto_cpf, data_voo, origem, destino, aeronave, horario_partida, horario_chegada, status, data_atribuicao)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmado', datetime('now'))
                `;
                
                db.run(query, [
                    atribuicao.vooId,
                    atribuicao.pilotoCpf,
                    atribuicao.dataVoo,
                    atribuicao.origem,
                    atribuicao.destino,
                    atribuicao.aeronave,
                    atribuicao.horarioPartida,
                    atribuicao.horarioChegada
                ], function(err) {
                    if (err) {
                        console.log(`ℹ️ Atribuição já existe ou erro: ${atribuicao.vooId}`);
                        resolve();
                    } else {
                        console.log(`✅ Atribuição demo criada: ${atribuicao.vooId} para ${atribuicao.pilotoCpf}`);
                        resolve();
                    }
                });
            });
        }

        console.log(`🎉 Demonstração configurada: ${usuariosCriados} usuários, ${voosCriados} voos`);
        
        res.json({
            success: true,
            message: 'Demonstração configurada com sucesso!',
            usuariosCriados: usuariosCriados,
            voosCriados: voosCriados
        });

    } catch (error) {
        console.error('❌ Erro na configuração da demo:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao configurar demonstração: ' + error.message
        });
    }
});

// Rota dashboard estatísticas (mantida)
app.get('/api/dashboard/estatisticas', (req, res) => {
    console.log('📊 Buscando estatísticas...');
    
    db.get("SELECT COUNT(*) as totalVoos FROM voos", (err, voosRow) => {
        if (err) {
            console.error('Erro ao buscar voos:', err);
            return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
        }
        
        db.get("SELECT COUNT(*) as totalUsuarios FROM usuarios", (err, usuariosRow) => {
            if (err) {
                console.error('Erro ao buscar usuários:', err);
                return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
            }
            
            db.get("SELECT COUNT(*) as totalPassagens FROM passagens", (err, passagensRow) => {
                if (err) {
                    console.error('Erro ao buscar passagens:', err);
                    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
                }

                // ✅ NOVO: Buscar estatísticas de atribuições
                db.get("SELECT COUNT(*) as totalAtribuicoes FROM voos_atribuidos", (err, atribuicoesRow) => {
                    if (err) {
                        console.error('Erro ao buscar atribuições:', err);
                        // Continua mesmo com erro nas atribuições
                    }
                    
                    res.json({
                        success: true,
                        totalVoos: voosRow ? voosRow.totalVoos : 0,
                        totalUsuarios: usuariosRow ? usuariosRow.totalUsuarios : 0,
                        totalPassagens: passagensRow ? passagensRow.totalPassagens : 0,
                        totalAtribuicoes: atribuicoesRow ? atribuicoesRow.totalAtribuicoes : 0,
                        ocupacaoMedia: '75%'
                    });
                });
            });
        });
    });
});

// Rotas para HTML (mantidas)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../login.html'));
});

app.get('/cadastro', (req, res) => {
    res.sendFile(path.join(__dirname, '../cadastro.html'));
});

app.get('/cliente', (req, res) => {
    res.sendFile(path.join(__dirname, '../cliente.html'));
});

app.get('/funcionario', (req, res) => {
    res.sendFile(path.join(__dirname, '../funcionario.html'));
});

app.get('/diretor', (req, res) => {
    res.sendFile(path.join(__dirname, '../diretor.html'));
});

app.get('/comissario', (req, res) => {
    res.sendFile(path.join(__dirname, '../comissario.html'));
});

app.get('/piloto', (req, res) => {
    res.sendFile(path.join(__dirname, '../piloto.html'));
});

app.get('/pagamento', (req, res) => {
    res.sendFile(path.join(__dirname, '../pagamento.html'));
});

app.get('/passagens.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../passagens.html'));
});

// Rota de saúde
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Iniciar servidor se não for test
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
        console.log(`Acesse: http://localhost:${PORT}`);
    });
}

module.exports = app;
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

// Rota demo setup
app.post('/api/demo/setup', async (req, res) => {
    console.log('🚀 Iniciando configuração de demonstração...');
    
    try {
        const usuariosDemo = [
            { nome: 'João Silva', cpf: '12345678900', senha: '1234', tipo: 'cliente', email: 'joao.silva@email.com' },
            // Corrigido para os tipos do seu reset-db.js
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
                piloto_id: 3, // Ana Piloto (Exemplo, IDs podem variar)
                co_piloto_id: 6 // Paulo Piloto
            },
            {
                codigo: 'VG1002',
                origem: 'Rio de Janeiro (GIG)',
                destino: 'São Paulo (GRU)',
                data_partida: '2024-12-20',
                hora_partida: '11:00',
                data_chegada: '2024-12-20',
                hora_chegada: '12:30',
                preco_base: 299.99,
                assentos_disponiveis: 150,
                status: 'agendado',
                piloto_id: 6, // Paulo Piloto
                co_piloto_id: 3 // Ana Piloto
            },
            {
                codigo: 'VG2001',
                origem: 'São Paulo (GRU)',
                destino: 'Salvador (SSA)',
                data_partida: '2024-12-21',
                hora_partida: '14:00',
                data_chegada: '2024-12-21',
                hora_chegada: '16:30',
                preco_base: 499.99,
                assentos_disponiveis: 180,
                status: 'agendado',
                piloto_id: 3, // Ana Piloto
                co_piloto_id: null
            },
            {
                codigo: 'VG3001',
                origem: 'São Paulo (GRU)',
                destino: 'Florianópolis (FLN)',
                data_partida: '2024-12-22',
                hora_partida: '16:00',
                data_chegada: '2024-12-22',
                hora_chegada: '17:45',
                preco_base: 399.99,
                assentos_disponiveis: 120,
                status: 'agendado',
                piloto_id: 6, // Paulo Piloto
                co_piloto_id: null
            },
            {
                codigo: 'VG4001',
                origem: 'Rio de Janeiro (GIG)',
                destino: 'Belo Horizonte (CNF)',
                data_partida: '2024-12-23',
                hora_partida: '09:00',
                data_chegada: '2024-12-23',
                hora_chegada: '10:30',
                preco_base: 249.99,
                assentos_disponiveis: 100,
                status: 'agendado',
                piloto_id: null,
                co_piloto_id: null
            }
        ];

        let usuariosCriados = 0;
        let voosCriados = 0;

        // Inserir usuários de demo
        for (const usuario of usuariosDemo) {
            await new Promise((resolve, reject) => {
                // Agora 'db.get' vai funcionar
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

// Rota dashboard estatísticas (simplificada, pois o diretor.html já faz isso)
app.get('/api/dashboard/estatisticas', (req, res) => {
    console.log('📊 Buscando estatísticas (rota simplificada)...');
    // O painel do diretor agora busca os dados brutos e calcula no frontend.
    // Esta rota pode ser usada por outras partes ou removida se não for mais necessária.
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
                
                res.json({
                    success: true,
                    totalVoos: voosRow ? voosRow.totalVoos : 0,
                    totalUsuarios: usuariosRow ? usuariosRow.totalUsuarios : 0,
                    totalPassagens: passagensRow ? passagensRow.totalPassagens : 0,
                    ocupacaoMedia: '75%' // Valor estático, já que o frontend calcula
                });
            });
        });
    });
});

// Rotas para HTML
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
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// ✅ CORREÇÃO: Caminho correto para o banco de dados
const dbPath = path.join(__dirname, '..', 'database.sqlite');

console.log('📁 Caminho do banco:', dbPath);

// Verificar se o diretório existe, se não, criar
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    console.log('📂 Criando diretório para banco de dados...');
    fs.mkdirSync(dbDir, { recursive: true });
}

// Criar conexão com o banco de dados
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar com o banco de dados:', err.message);
        console.error('📁 Caminho tentado:', dbPath);
    } else {
        console.log('✅ Conectado ao banco de dados SQLite com sucesso!');
        console.log('📍 Local:', dbPath);
        
        // Verificar se as tabelas principais existem
        verificarEstruturaBanco();
    }
});

// Configurar timeout para evitar travamentos
db.configure("busyTimeout", 5000);

// Função para verificar e criar estrutura do banco se necessário
function verificarEstruturaBanco() {
    console.log('🔍 Verificando estrutura do banco de dados...');
    
    const tabelasNecessarias = [
        'usuarios',
        'voos', 
        'aeronaves',
        'passagens',
        'formas_pagamento',
        'voos_atribuidos',
        'checkins'
    ];

    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
            console.error('❌ Erro ao verificar tabelas:', err);
            return;
        }

        const tabelasExistentes = tables.map(t => t.name);
        console.log('📋 Tabelas existentes:', tabelasExistentes);

        // Verificar se tabelas críticas existem
        const tabelasFaltantes = tabelasNecessarias.filter(t => !tabelasExistentes.includes(t));
        
        if (tabelasFaltantes.length > 0) {
            console.warn('⚠️  Tabelas faltantes:', tabelasFaltantes);
            console.log('💡 Execute o script reset-db.js para criar a estrutura completa.');
        } else {
            console.log('✅ Estrutura do banco verificada com sucesso!');
        }

        // Verificar dados mínimos
        verificarDadosMinimos();
    });
}

// Função para verificar dados mínimos necessários
function verificarDadosMinimos() {
    // Verificar formas de pagamento
    db.get("SELECT COUNT(*) as count FROM formas_pagamento", (err, result) => {
        if (err) {
            console.error('❌ Erro ao verificar formas de pagamento:', err);
            return;
        }

        if (result.count === 0) {
            console.log('💡 Inserindo formas de pagamento padrão...');
            const formasPagamento = [
                { nome: 'Cartão de Crédito', parcelas_maximas: 18 },
                { nome: 'PIX', parcelas_maximas: 1 },
                { nome: 'Boleto Bancário', parcelas_maximas: 10 }
            ];

            formasPagamento.forEach(forma => {
                db.run(
                    "INSERT OR IGNORE INTO formas_pagamento (nome, parcelas_maximas) VALUES (?, ?)",
                    [forma.nome, forma.parcelas_maximas]
                );
            });
        }
    });

    // Verificar aeronaves
    db.get("SELECT COUNT(*) as count FROM aeronaves", (err, result) => {
        if (err) {
            console.error('❌ Erro ao verificar aeronaves:', err);
            return;
        }

        if (result.count === 0) {
            console.log('💡 Inserindo aeronaves padrão...');
            const aeronaves = [
                {
                    modelo: 'Boeing 737-800',
                    codigo: 'B738001',
                    capacidade: 186,
                    fabricante: 'Boeing',
                    ano_fabricacao: 2018
                },
                {
                    modelo: 'Airbus A320',
                    codigo: 'A320001',
                    capacidade: 180,
                    fabricante: 'Airbus',
                    ano_fabricacao: 2019
                },
                {
                    modelo: 'Embraer E195',
                    codigo: 'E195001',
                    capacidade: 124,
                    fabricante: 'Embraer',
                    ano_fabricacao: 2020
                }
            ];

            aeronaves.forEach(aeronave => {
                db.run(
                    "INSERT OR IGNORE INTO aeronaves (modelo, codigo, capacidade, fabricante, ano_fabricacao) VALUES (?, ?, ?, ?, ?)",
                    [aeronave.modelo, aeronave.codigo, aeronave.capacidade, aeronave.fabricante, aeronave.ano_fabricacao]
                );
            });
        }
    });
}

// Funções utilitárias para operações com o banco

// Executar query e retornar todas as linhas
function all(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Executar query e retornar uma linha
function get(query, params = []) {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Executar query (INSERT, UPDATE, DELETE)
function run(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ 
                    lastID: this.lastID, 
                    changes: this.changes 
                });
            }
        });
    });
}

// Fechar conexão com o banco
function close() {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {
                reject(err);
            } else {
                console.log('✅ Conexão com o banco de dados fechada.');
                resolve();
            }
        });
    });
}

// Eventos do banco
db.on('trace', (sql) => {
    // console.log('📝 SQL:', sql); // Descomente para debug de queries
});

db.on('profile', (sql, time) => {
    if (time > 100) { // Log apenas queries lentas (>100ms)
        console.log(`🐌 Query lenta (${time}ms):`, sql);
    }
});

// Fechar conexão graciosamente ao encerrar a aplicação
process.on('SIGINT', async () => {
    console.log('\n🔄 Fechando conexão com o banco de dados...');
    try {
        await close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro ao fechar banco:', err);
        process.exit(1);
    }
});

process.on('exit', () => {
    console.log('👋 Encerrando aplicação...');
});

// Exportar a conexão e funções utilitárias
module.exports = { 
    db,
    getDatabase: () => db,
    all,
    get, 
    run,
    close
};
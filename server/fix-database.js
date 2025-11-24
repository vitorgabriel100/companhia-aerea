// fix-database.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Corrigindo estrutura do banco de dados...');

db.serialize(() => {
    // 1. Corrigir tabela usuarios
    console.log('Corrigindo tabela usuarios...');
    
    // Adicionar coluna telefone se não existir
    db.run(`ALTER TABLE usuarios ADD COLUMN telefone TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.log('Telefone:', err.message);
        } else {
            console.log('Coluna telefone verificada');
        }
    });

    // Atualizar CHECK constraint para novos tipos
    db.run(`PRAGMA foreign_keys=OFF`, () => {
        // Criar tabela temporária com nova estrutura
        db.run(`CREATE TABLE usuarios_temp (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT NOT NULL UNIQUE,
            email TEXT,
            senha TEXT NOT NULL,
            tipo TEXT NOT NULL CHECK(tipo IN ('cliente', 'funcionario', 'diretor', 'comissario', 'piloto')),
            matricula TEXT UNIQUE,
            telefone TEXT,
            data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Copiar dados
        db.run(`INSERT INTO usuarios_temp 
                SELECT id, nome, cpf, email, senha, tipo, matricula, telefone, data_cadastro 
                FROM usuarios`);

        // Dropar tabela antiga
        db.run(`DROP TABLE usuarios`);

        // Renomear tabela temporária
        db.run(`ALTER TABLE usuarios_temp RENAME TO usuarios`);

        console.log('Tabela usuarios atualizada com novos tipos');
    });

    // 2. Corrigir/Recriar tabela aeronaves
    console.log('Verificando tabela aeronaves...');
    
    db.run(`CREATE TABLE IF NOT EXISTS aeronaves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT NOT NULL UNIQUE,
        modelo TEXT NOT NULL,
        fabricante TEXT NOT NULL,
        capacidade INTEGER NOT NULL,
        status TEXT DEFAULT 'ativa',
        data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.log('Aeronaves:', err.message);
        } else {
            console.log('Tabela aeronaves verificada');
        }
    });

    // 3. Corrigir/Recriar tabela voos
    console.log('Corrigindo tabela voos...');
    
    db.run(`CREATE TABLE IF NOT EXISTS voos_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT NOT NULL UNIQUE,
        origem TEXT NOT NULL,
        destino TEXT NOT NULL,
        data_partida DATE NOT NULL,
        hora_partida TIME NOT NULL,
        data_chegada DATE NOT NULL,
        hora_chegada TIME NOT NULL,
        aeronave_id INTEGER,
        piloto_id INTEGER,
        co_piloto_id INTEGER,
        preco_base DECIMAL(10,2) NOT NULL,
        assentos_disponiveis INTEGER NOT NULL,
        status TEXT DEFAULT 'agendado',
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (aeronave_id) REFERENCES aeronaves(id),
        FOREIGN KEY (piloto_id) REFERENCES usuarios(id),
        FOREIGN KEY (co_piloto_id) REFERENCES usuarios(id)
    )`);

    // Verificar se existe dados para migrar
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='voos'`, (err, row) => {
        if (row) {
            db.run(`INSERT INTO voos_temp (id, codigo, origem, destino, data_partida, hora_partida, data_chegada, hora_chegada, aeronave_id, piloto_id, co_piloto_id, preco_base, assentos_disponiveis, status, data_criacao)
                    SELECT id, codigo, origem, destino, 
                           date('now') as data_partida, 
                           time('12:00') as hora_partida,
                           date('now') as data_chegada,
                           time('14:00') as hora_chegada,
                           NULL as aeronave_id,
                           NULL as piloto_id,
                           NULL as co_piloto_id,
                           500.00 as preco_base,
                           150 as assentos_disponiveis,
                           'agendado' as status,
                           datetime('now') as data_criacao
                    FROM voos`);
            
            db.run(`DROP TABLE voos`);
        }

        db.run(`ALTER TABLE voos_temp RENAME TO voos`);
        console.log('Tabela voos corrigida');
    });

    // 4. Criar tabela tripulacao_voos se não existir
    console.log('👥 Verificando tabela tripulacao_voos...');
    
    db.run(`CREATE TABLE IF NOT EXISTS tripulacao_voos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voo_id INTEGER NOT NULL,
        usuario_id INTEGER NOT NULL,
        funcao TEXT NOT NULL,
        data_atribuicao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (voo_id) REFERENCES voos(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        UNIQUE(voo_id, usuario_id)
    )`, (err) => {
        if (err) {
            console.log('Tripulação:', err.message);
        } else {
            console.log('Tabela tripulacao_voos verificada');
        }
    });

    // 5. Inserir dados de exemplo
    console.log('Inserindo dados de exemplo...');
    
    // Inserir aeronaves de exemplo
    const aeronaves = [
        { codigo: 'AIR001', modelo: 'Boeing 737', fabricante: 'Boeing', capacidade: 180 },
        { codigo: 'AIR002', modelo: 'Airbus A320', fabricante: 'Airbus', capacidade: 150 },
        { codigo: 'AIR003', modelo: 'Embraer E195', fabricante: 'Embraer', capacidade: 120 }
    ];

    aeronaves.forEach(aeronave => {
        db.run(`INSERT OR IGNORE INTO aeronaves (codigo, modelo, fabricante, capacidade) 
                VALUES (?, ?, ?, ?)`,
            [aeronave.codigo, aeronave.modelo, aeronave.fabricante, aeronave.capacidade]);
    });

    // Inserir voos de exemplo
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);
    
    const voos = [
        {
            codigo: 'VG1001',
            origem: 'São Paulo (GRU)',
            destino: 'Rio de Janeiro (GIG)',
            data_partida: hoje.toISOString().split('T')[0],
            hora_partida: '08:00',
            data_chegada: hoje.toISOString().split('T')[0],
            hora_chegada: '09:30',
            preco_base: 350.00,
            assentos_disponiveis: 150
        },
        {
            codigo: 'VG1002', 
            origem: 'Rio de Janeiro (GIG)',
            destino: 'Brasília (BSB)',
            data_partida: amanha.toISOString().split('T')[0],
            hora_partida: '14:00',
            data_chegada: amanha.toISOString().split('T')[0],
            hora_chegada: '16:00',
            preco_base: 450.00,
            assentos_disponiveis: 120
        }
    ];

    voos.forEach(voo => {
        db.run(`INSERT OR IGNORE INTO voos (codigo, origem, destino, data_partida, hora_partida, data_chegada, hora_chegada, preco_base, assentos_disponiveis) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [voo.codigo, voo.origem, voo.destino, voo.data_partida, voo.hora_partida, 
             voo.data_chegada, voo.hora_chegada, voo.preco_base, voo.assentos_disponiveis]);
    });

    // 6. Atualizar tipos de usuário existentes
    console.log('Atualizando tipos de usuário...');
    
    db.run(`UPDATE usuarios SET tipo = 'comissario' WHERE nome LIKE '%Comissari%' AND tipo = 'funcionario'`);
    db.run(`UPDATE usuarios SET tipo = 'piloto' WHERE nome LIKE '%Pilot%' AND tipo = 'funcionario'`);
    db.run(`UPDATE usuarios SET tipo = 'diretor' WHERE nome LIKE '%Diretor%' AND tipo = 'funcionario'`);

    console.log('🎉 Estrutura do banco corrigida com sucesso!');
});

db.close(() => {
    console.log('Banco de dados fechado');
    console.log('\nPRONTO! Agora execute os testes novamente:');
    console.log('   npm test -- auth.test.js');
});
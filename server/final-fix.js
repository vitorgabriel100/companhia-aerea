// final-fix.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('🔧 APLICANDO CORREÇÕES FINAIS...');

db.serialize(() => {
    // 1. Adicionar colunas faltantes na tabela usuarios
    console.log('1. Corrigindo tabela usuarios...');
    
    const userColumns = [
        'status TEXT DEFAULT "ativo"',
        'data_nascimento TEXT',
        'data_admissao TEXT', 
        'salario DECIMAL(10,2)',
        'endereco TEXT'
    ];

    userColumns.forEach(column => {
        const [colName] = column.split(' ');
        db.run(`ALTER TABLE usuarios ADD COLUMN ${column}`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.log(`   ⚠️  ${colName}: ${err.message}`);
            } else {
                console.log(`   ✅ ${colName} verificado`);
            }
        });
    });

    // 2. Criar tabela passagens se não existir
    console.log('2. Criando tabela passagens...');
    
    db.run(`CREATE TABLE IF NOT EXISTS passagens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voo_id INTEGER NOT NULL,
        usuario_id INTEGER NOT NULL,
        assento TEXT NOT NULL,
        forma_pagamento TEXT NOT NULL,
        parcelas INTEGER DEFAULT 1,
        preco_final DECIMAL(10,2) NOT NULL,
        data_compra DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'confirmada',
        classe TEXT DEFAULT 'economica',
        FOREIGN KEY (voo_id) REFERENCES voos(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )`, (err) => {
        if (err) {
            console.log('   ⚠️  Passagens:', err.message);
        } else {
            console.log('   ✅ Tabela passagens criada');
        }
    });

    // 3. Corrigir nome da tabela de tripulação
    console.log('3. Corrigindo tabela de tripulação...');
    
    // Verificar qual nome de tabela existe
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND (name='tripulacao_voos' OR name='tripulacao_voo')", (err, row) => {
        if (err) {
            console.log('   ⚠️  Erro ao verificar tripulação:', err.message);
            return;
        }

        if (!row) {
            // Criar tabela se não existir
            db.run(`CREATE TABLE tripulacao_voos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                voo_id INTEGER NOT NULL,
                usuario_id INTEGER NOT NULL,
                funcao TEXT NOT NULL,
                data_atribuicao DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (voo_id) REFERENCES voos(id),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
                UNIQUE(voo_id, usuario_id)
            )`, (err) => {
                if (err) {
                    console.log('   ⚠️  Tripulação:', err.message);
                } else {
                    console.log('   ✅ Tabela tripulacao_voos criada');
                }
            });
        } else if (row.name === 'tripulacao_voo') {
            // Renomear se estiver com nome antigo
            db.run(`ALTER TABLE tripulacao_voo RENAME TO tripulacao_voos`, (err) => {
                if (err) {
                    console.log('   ⚠️  Erro ao renomear:', err.message);
                } else {
                    console.log('   ✅ Tabela renomeada para tripulacao_voos');
                }
            });
        } else {
            console.log('   ✅ Tabela tripulacao_voos já existe');
        }
    });

    // 4. Inserir alguns dados de exemplo para testes
    console.log('4. Inserindo dados de exemplo...');
    
    // Inserir uma passagem de exemplo
    db.get("SELECT COUNT(*) as count FROM passagens", (err, row) => {
        if (err) {
            console.log('   ⚠️  Erro ao verificar passagens:', err.message);
            return;
        }

        if (row.count === 0) {
            // Buscar primeiro voo e usuário
            db.get("SELECT id FROM voos ORDER BY id LIMIT 1", (err, voo) => {
                if (voo) {
                    db.get("SELECT id FROM usuarios WHERE tipo = 'cliente' ORDER BY id LIMIT 1", (err, usuario) => {
                        if (usuario) {
                            db.run(`INSERT INTO passagens (voo_id, usuario_id, assento, forma_pagamento, preco_final) 
                                    VALUES (?, ?, ?, ?, ?)`,
                                [voo.id, usuario.id, '12A', 'Cartão de Crédito', 350.00],
                                (err) => {
                                    if (err) {
                                        console.log('   ⚠️  Erro ao inserir passagem:', err.message);
                                    } else {
                                        console.log('   ✅ Passagem de exemplo inserida');
                                    }
                                }
                            );
                        }
                    });
                }
            });
        }
    });

    console.log('🎉 CORREÇÕES APLICADAS!');
});

db.close();
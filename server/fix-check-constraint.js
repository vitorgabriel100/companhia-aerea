// fix-check-constraint.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Corrigindo CHECK constraint da tabela usuarios...');

db.serialize(() => {
    // 1. Desativar foreign keys temporariamente
    db.run('PRAGMA foreign_keys=OFF');
    
    // 2. Criar tabela temporária sem CHECK constraint
    db.run(`CREATE TABLE usuarios_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cpf TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        tipo TEXT NOT NULL,
        matricula TEXT UNIQUE,
        email TEXT,
        telefone TEXT,
        data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // 3. Copiar dados da tabela antiga para a nova
    db.run(`INSERT INTO usuarios_temp 
            SELECT id, nome, cpf, senha, tipo, matricula, email, telefone, data_cadastro 
            FROM usuarios`);
    
    // 4. Dropar tabela antiga
    db.run('DROP TABLE usuarios');
    
    // 5. Renomear tabela temporária
    db.run('ALTER TABLE usuarios_temp RENAME TO usuarios');
    
    console.log('CHECK constraint removida com sucesso!');
    console.log('Agora a tabela aceita os tipos: cliente, comissario, piloto, diretor');
});

db.close(() => {
    console.log('Banco de dados fechado');
    console.log('\nExecute os testes novamente: npm test -- auth.test.js');
});
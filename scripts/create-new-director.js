// create-new-director-simple.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Criando novo diretor...');

const diretor = {
    nome: 'Diretor Principal',
    cpf: '111.222.333-44', 
    senha: '1234',
    tipo: 'diretor',
    matricula: 'DIR001',
    email: 'diretor@companhiaaerea.com',
    telefone: '(11) 99999-9999',
    data_admissao: '2024-01-01',
    salario: 25000.00,
    status: 'ativo'
};

// Deletar diretor existente primeiro
db.run("DELETE FROM usuarios WHERE tipo = 'diretor'", function() {
    console.log('🗑️  Diretores antigos removidos');
    
    // Inserir novo diretor
    db.run(`
        INSERT INTO usuarios (nome, cpf, senha, tipo, matricula, email, telefone, data_admissao, salario, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        diretor.nome, diretor.cpf, diretor.senha, diretor.tipo, diretor.matricula,
        diretor.email, diretor.telefone, diretor.data_admissao, diretor.salario, diretor.status
    ], function(err) {
        if (err) {
            console.error('❌ Erro:', err.message);
        } else {
            console.log('✅ Diretor criado com sucesso!');
            console.log('📧 CPF: 111.222.333-44');
            console.log('🔑 Senha: 1234');
        }
        db.close();
    });
});
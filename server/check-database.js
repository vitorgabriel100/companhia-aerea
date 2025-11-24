// server/check-database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('VERIFICANDO ESTRUTURA DO BANCO...');
console.log('Banco:', dbPath);

// Verificar estrutura da tabela usuarios
db.all("PRAGMA table_info(usuarios)", (err, columns) => {
  if (err) {
    console.log('Erro ao verificar tabela usuarios:', err.message);
    return;
  }
  
  console.log('\nESTRUTURA DA TABELA usuarios:');
  console.log('================================');
  columns.forEach(col => {
    console.log(`  ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
  });
  
  // Verificar dados existentes
  db.all("SELECT id, nome, cpf, tipo, matricula FROM usuarios LIMIT 5", (err, users) => {
    if (err) {
      console.log('Erro ao buscar usuários:', err.message);
    } else {
      console.log('\nPRIMEIROS 5 USUÁRIOS:');
      console.log('========================');
      users.forEach(user => {
        console.log(`  ${user.id}: ${user.nome} (${user.tipo}) - ${user.cpf} - Mat: ${user.matricula || 'N/A'}`);
      });
    }
    
    db.close();
  });
});
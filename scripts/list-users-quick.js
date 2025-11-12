// list-users-quick.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('👥 USUÁRIOS DO SISTEMA:\n');

db.all(`
    SELECT nome, cpf, tipo, matricula, status 
    FROM usuarios 
    ORDER BY tipo, nome
`, (err, rows) => {
    if (err) {
        console.error('❌ Erro:', err);
        db.close();
        return;
    }
    
    // Agrupar por tipo
    const grupos = {};
    rows.forEach(user => {
        if (!grupos[user.tipo]) grupos[user.tipo] = [];
        grupos[user.tipo].push(user);
    });
    
    // Mostrar por tipo
    ['diretor', 'piloto', 'comissario', 'cliente'].forEach(tipo => {
        if (grupos[tipo]) {
            const emoji = tipo === 'diretor' ? '👑' : tipo === 'piloto' ? '✈️' : tipo === 'comissario' ? '👨‍✈️' : '👤';
            console.log(`${emoji} ${tipo.toUpperCase()}S (${grupos[tipo].length}):`);
            
            grupos[tipo].forEach(user => {
                const status = user.status === 'ativo' ? '✅' : '❌';
                console.log(`   ${status} ${user.nome}`);
                console.log(`      CPF: ${user.cpf} | Senha: 1234 ${user.matricula ? `| Mat: ${user.matricula}` : ''}`);
            });
            console.log('');
        }
    });
    
    console.log(`📊 Total: ${rows.length} usuários`);
    db.close();
});
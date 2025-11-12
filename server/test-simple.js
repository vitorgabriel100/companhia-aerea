const db = require('./models/database');

console.log('🧪 Teste simples do banco de dados\n');

// Testar conexão com o banco
db.get("SELECT name FROM sqlite_master WHERE type='table'", (err, row) => {
    if (err) {
        console.error('❌ Erro ao conectar com banco:', err);
        return;
    }
    
    console.log('✅ Banco conectado com sucesso!');
    
    // Listar tabelas
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
            console.error('Erro ao listar tabelas:', err);
            return;
        }
        
        console.log('\n📊 Tabelas no banco:');
        tables.forEach(table => {
            console.log(`- ${table.name}`);
        });
        
        // Contar usuários
        db.get("SELECT COUNT(*) as count FROM usuarios", (err, row) => {
            console.log(`\n👥 Total de usuários: ${row.count}`);
            
            // Listar usuários
            db.all("SELECT cpf, nome, tipo FROM usuarios", (err, users) => {
                console.log('\n📋 Usuários cadastrados:');
                users.forEach(user => {
                    console.log(`- ${user.nome} (${user.tipo}) - CPF: ${user.cpf}`);
                });
                
                db.close();
            });
        });
    });
});
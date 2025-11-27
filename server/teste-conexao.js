const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.sqlite');

console.log('🔍 TESTANDO CONEXÃO COM O BANCO');
console.log('================================');

// Verificar se o arquivo do banco existe
console.log('📁 Arquivo do banco existe?:', fs.existsSync(dbPath) ? 'SIM ✅' : 'NÃO ❌');
console.log('   Caminho:', dbPath);

if (fs.existsSync(dbPath)) {
    console.log('   Tamanho:', fs.statSync(dbPath).size, 'bytes');
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ ERRO ao conectar com o banco:', err.message);
        return;
    }
    
    console.log('✅ Conectado ao banco com sucesso!');
    
    // Testar inserção direta
    console.log('\n🧪 TESTANDO INSERÇÃO DIRETA...');
    const testCPF = '58795536205';
    const testSenha = '1234';
    
    const query = "INSERT INTO usuarios (nome, cpf, senha, tipo, status) VALUES (?, ?, ?, ?, 'ativo')";
    
    db.run(query, ['Teste Direto', testCPF, testSenha, 'cliente'], function(err) {
        if (err) {
            console.error('❌ ERRO na inserção direta:', err.message);
            db.close();
            return;
        }
        
        console.log('✅ INSERÇÃO DIRETA FUNCIONOU!');
        console.log('   ID do novo usuário:', this.lastID);
        console.log('   Linhas afetadas:', this.changes);
        
        // Verificar se realmente foi salvo
        db.get("SELECT * FROM usuarios WHERE cpf = ?", [testCPF], (err, user) => {
            if (err) {
                console.error('❌ Erro ao verificar inserção:', err);
            } else if (user) {
                console.log('✅ USUÁRIO ENCONTRADO APÓS INSERÇÃO:');
                console.log('   ID:', user.id);
                console.log('   Nome:', user.nome);
                console.log('   CPF:', user.cpf);
            } else {
                console.log('❌ USUÁRIO NÃO ENCONTRADO após inserção!');
            }
            
            db.close();
        });
    });
});
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 VERIFICAÇÃO COMPLETA DO BANCO DE DADOS');
console.log('=========================================');

// 1. Verificar estrutura da tabela usuarios
db.all("PRAGMA table_info(usuarios)", (err, columns) => {
    if (err) {
        console.error('❌ Erro ao verificar estrutura da tabela:', err);
        return;
    }
    
    console.log('\n📋 ESTRUTURA DA TABELA usuarios:');
    console.log('--------------------------------');
    columns.forEach(col => {
        console.log(`   ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // 2. Verificar todos os usuários
    db.all("SELECT id, nome, cpf, tipo, senha, status FROM usuarios", (err, users) => {
        if (err) {
            console.error('❌ Erro ao buscar usuários:', err);
            return;
        }
        
        console.log(`\n👥 TODOS OS USUÁRIOS (${users.length}):`);
        console.log('--------------------------------');
        users.forEach(user => {
            console.log(`   ${user.id}: ${user.nome} (${user.tipo})`);
            console.log(`      CPF: ${user.cpf}`);
            console.log(`      Senha: ${user.senha}`);
            console.log(`      Status: ${user.status}`);
            console.log('   ---');
        });
        
        // 3. Verificar usuário específico
        const testCPF = '58795536205';
        console.log(`\n🔎 PROCURANDO USUÁRIO COM CPF: ${testCPF}`);
        console.log('--------------------------------');
        
        db.get("SELECT * FROM usuarios WHERE cpf = ?", [testCPF], (err, user) => {
            if (err) {
                console.error('❌ Erro ao buscar usuário específico:', err);
                return;
            }
            
            if (user) {
                console.log('✅ USUÁRIO ENCONTRADO:');
                console.log('   ID:', user.id);
                console.log('   Nome:', user.nome);
                console.log('   CPF:', user.cpf);
                console.log('   Tipo:', user.tipo);
                console.log('   Status:', user.status);
                console.log('   Senha:', user.senha);
                console.log('   Email:', user.email);
                console.log('   Telefone:', user.telefone);
                
                // 4. Testar a query de login
                console.log(`\n🔐 TESTANDO QUERY DE LOGIN PARA CPF: ${testCPF}`);
                console.log('--------------------------------');
                
                const loginQuery = "SELECT * FROM usuarios WHERE cpf = ? AND senha = ? AND status = 'ativo'";
                db.get(loginQuery, [testCPF, '1234'], (err, loginResult) => {
                    if (err) {
                        console.error('❌ Erro no teste de login:', err);
                        return;
                    }
                    
                    console.log('📋 RESULTADO DA QUERY DE LOGIN:');
                    console.log('   Query:', loginQuery);
                    console.log('   CPF:', testCPF);
                    console.log('   Senha:', '1234');
                    console.log('   Usuário encontrado?:', loginResult ? 'SIM ✅' : 'NÃO ❌');
                    
                    if (!loginResult) {
                        console.log('\n🔎 INVESTIGANDO FALHA NO LOGIN:');
                        console.log('--------------------------------');
                        
                        // Verificar senha
                        db.get("SELECT * FROM usuarios WHERE cpf = ? AND senha = ?", [testCPF, '1234'], (err, senhaCheck) => {
                            console.log('   - Senha "1234" está correta?:', senhaCheck ? 'SIM' : 'NÃO');
                            
                            // Verificar status
                            db.get("SELECT * FROM usuarios WHERE cpf = ? AND status = 'ativo'", [testCPF], (err, statusCheck) => {
                                console.log('   - Status é "ativo"?:', statusCheck ? 'SIM' : 'NÃO');
                                
                                // Verificar com senha vazia
                                db.get("SELECT * FROM usuarios WHERE cpf = ? AND senha = ''", [testCPF], (err, senhaVazia) => {
                                    console.log('   - Senha está vazia?:', senhaVazia ? 'SIM' : 'NÃO');
                                    
                                    // Verificar senha real
                                    db.get("SELECT senha FROM usuarios WHERE cpf = ?", [testCPF], (err, senhaReal) => {
                                        if (senhaReal) {
                                            console.log('   - Senha real no banco:', `"${senhaReal.senha}"`);
                                            console.log('   - Tamanho da senha:', senhaReal.senha ? senhaReal.senha.length : 'vazia');
                                        }
                                        
                                        db.close();
                                        console.log('\n✅ Verificação concluída!');
                                    });
                                });
                            });
                        });
                    } else {
                        db.close();
                        console.log('\n✅ Login funciona no banco! O problema está no código.');
                    }
                });
            } else {
                console.log('❌ USUÁRIO NÃO ENCONTRADO com este CPF');
                console.log('   O cadastro não está salvando no banco!');
                db.close();
            }
        });
    });
});
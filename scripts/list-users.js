const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configurar caminho do banco de dados
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('📋 LISTA COMPLETA DE USUÁRIOS CADASTRADOS\n');

// Buscar todos os usuários com informações completas
const query = `
    SELECT 
        id, nome, cpf, tipo, matricula, email, telefone, 
        data_nascimento, data_admissao, salario, status, data_cadastro
    FROM usuarios 
    ORDER BY 
        CASE tipo 
            WHEN 'diretor' THEN 1
            WHEN 'piloto' THEN 2
            WHEN 'comissario' THEN 3
            WHEN 'cliente' THEN 4
            ELSE 5
        END,
        nome
`;

db.all(query, (err, rows) => {
    if (err) {
        console.error('❌ Erro ao buscar usuários:', err);
        db.close();
        return;
    }
    
    console.log(`👥 TOTAL DE USUÁRIOS: ${rows.length}`);
    console.log('=' .repeat(80));
    
    // Estatísticas por tipo
    const stats = {
        diretor: 0,
        piloto: 0,
        comissario: 0,
        cliente: 0,
        ativos: 0,
        inativos: 0
    };
    
    rows.forEach((user) => {
        stats[user.tipo] = (stats[user.tipo] || 0) + 1;
        if (user.status === 'ativo') stats.ativos++;
        else stats.inativos++;
    });
    
    console.log('📊 ESTATÍSTICAS:');
    console.log(`   🎯 Diretores: ${stats.diretor}`);
    console.log(`   ✈️  Pilotos: ${stats.piloto}`);
    console.log(`   👨‍✈️ Comissários: ${stats.comissario}`);
    console.log(`   👥 Clientes: ${stats.cliente}`);
    console.log(`   ✅ Ativos: ${stats.ativos}`);
    console.log(`   ❌ Inativos: ${stats.inativos}`);
    console.log('=' .repeat(80));
    
    // Listar usuários detalhadamente
    rows.forEach((user, index) => {
        const emoji = getEmojiByType(user.tipo);
        const statusIcon = user.status === 'ativo' ? '🟢' : '🔴';
        
        console.log(`${index + 1}. ${emoji} ${user.nome} ${statusIcon}`);
        console.log(`   📧 CPF: ${user.cpf}`);
        console.log(`   🎫 Tipo: ${user.tipo.toUpperCase()}`);
        
        if (user.matricula) {
            console.log(`   🔢 Matrícula: ${user.matricula}`);
        }
        
        if (user.email) {
            console.log(`   📩 Email: ${user.email}`);
        }
        
        if (user.telefone) {
            console.log(`   📞 Telefone: ${user.telefone}`);
        }
        
        if (user.data_nascimento) {
            console.log(`   🎂 Data Nasc.: ${user.data_nascimento}`);
        }
        
        if (user.data_admissao && user.tipo !== 'cliente') {
            console.log(`   📅 Data Admissão: ${user.data_admissao}`);
        }
        
        if (user.salario && user.tipo !== 'cliente') {
            console.log(`   💰 Salário: R$ ${user.salario.toFixed(2)}`);
        }
        
        console.log(`   🔐 Senha: ${user.senha.substring(0, 15)}...`);
        console.log(`   📅 Cadastro: ${user.data_cadastro}`);
        console.log(`   🏷️  Status: ${user.status}`);
        console.log('-'.repeat(60));
    });
    
    // Resumo de credenciais de teste
    console.log('\n🔑 CREDENCIAIS DE TESTE DISPONÍVEIS:');
    console.log('=' .repeat(50));
    
    const testUsers = rows.filter(user => 
        user.cpf === '111.222.333-44' || // Diretor
        user.cpf === '123.456.789-00' || // Cliente
        user.cpf === '555.666.777-88' || // Piloto
        user.cpf === '111.222.333-44'    // Comissário
    );
    
    testUsers.forEach(user => {
        console.log(`${getEmojiByType(user.tipo)} ${user.tipo.toUpperCase()}:`);
        console.log(`   👤 ${user.nome}`);
        console.log(`   📧 CPF: ${user.cpf}`);
        console.log(`   🔑 Senha: 1234`);
        if (user.matricula) console.log(`   🎫 Matrícula: ${user.matricula}`);
        console.log('');
    });
    
    db.close();
});

function getEmojiByType(tipo) {
    switch (tipo) {
        case 'diretor': return '👑';
        case 'piloto': return '✈️';
        case 'comissario': return '👨‍✈️';
        case 'cliente': return '👤';
        default: return '❓';
    }
}

// Versão alternativa para listagem rápida
function listUsersQuick() {
    console.log('🚀 LISTAGEM RÁPIDA DE USUÁRIOS:\n');
    
    db.all("SELECT id, nome, cpf, tipo, matricula, status FROM usuarios ORDER BY tipo, nome", (err, rows) => {
        if (err) {
            console.error('❌ Erro:', err);
            return;
        }
        
        console.log(`📊 Total: ${rows.length} usuários\n`);
        
        const grouped = {};
        rows.forEach(user => {
            if (!grouped[user.tipo]) grouped[user.tipo] = [];
            grouped[user.tipo].push(user);
        });
        
        Object.keys(grouped).sort().forEach(tipo => {
            console.log(`${getEmojiByType(tipo)} ${tipo.toUpperCase()}S (${grouped[tipo].length}):`);
            grouped[tipo].forEach(user => {
                const status = user.status === 'ativo' ? '🟢' : '🔴';
                console.log(`   ${status} ${user.nome} - CPF: ${user.cpf} ${user.matricula ? `- Mat: ${user.matricula}` : ''}`);
            });
            console.log('');
        });
        
        db.close();
    });
}

// Verificar se deve usar listagem rápida
if (process.argv.includes('--quick') || process.argv.includes('-q')) {
    listUsersQuick();
}

// Tratamento de erros
db.on('error', (err) => {
    console.error('❌ Erro de conexão com o banco:', err);
});

process.on('exit', () => {
    db.close();
});
const request = require('supertest');
const app = require('./server');

async function testBackend() {
    console.log('🧪 Testando backend...\n');
    
    try {
        // Teste de saúde
        const health = await request(app).get('/api/health');
        console.log('✅ Saúde da API:', health.status);
        
        // Teste de cadastro
        const cadastro = await request(app)
            .post('/api/auth/cadastro')
            .send({
                nome: 'Teste Backend',
                cpf: '123.456.789-99',
                tipo: 'cliente',
                senha: 'teste123'
            });
        console.log('✅ Cadastro:', cadastro.status, cadastro.body);
        
        // Teste de login
        const login = await request(app)
            .post('/api/auth/login')
            .send({
                cpf: '123.456.789-99',
                senha: 'teste123'
            });
        console.log('✅ Login:', login.status, login.body);
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

testBackend();
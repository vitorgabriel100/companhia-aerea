const request = require('supertest');
const app = require('../server');

async function runAPITests() {
  console.log('Iniciando testes da API...\n');

  try {
    // Teste de saúde da API
    console.log('1. Testando saúde da API...');
    const healthResponse = await request(app).get('/');
    console.log(`Página inicial: ${healthResponse.status === 200 ? 'OK' : 'FALHA'}`);

    // Teste de voos
    console.log('2. Testando endpoint de voos...');
    const voosResponse = await request(app).get('/api/voos');
    console.log(`GET /api/voos: ${voosResponse.status === 200 ? 'OK' : 'FALHA'}`);
    if (voosResponse.body.success) {
      console.log(`Voos encontrados: ${voosResponse.body.voos ? voosResponse.body.voos.length : 0}`);
    } else {
      console.log(`Erro: ${voosResponse.body.message}`);
    }

    // Teste de formas de pagamento
    console.log('3. Testando formas de pagamento...');
    const pagamentoResponse = await request(app).get('/api/pagamento/formas-disponiveis');
    console.log(`GET /api/pagamento/formas-disponiveis: ${pagamentoResponse.status === 200 ? 'OK' : 'FALHA'}`);
    if (pagamentoResponse.body.success) {
      console.log(`Formas de pagamento: ${pagamentoResponse.body.formasPagamento ? pagamentoResponse.body.formasPagamento.length : 0}`);
    }

    // Teste de cadastro
    console.log('4. Testando cadastro de usuário...');
    const cadastroResponse = await request(app)
      .post('/api/auth/cadastro')
      .send({
        nome: 'Usuário Teste API',
        cpf: '111.333.555-77',
        tipo: 'cliente',
        senha: 'senhatest',
        email: 'teste@api.com',
        telefone: '(11) 99999-9999'
      });
    console.log(`POST /api/auth/cadastro: ${cadastroResponse.status === 200 ? 'OK' : 'FALHA'}`);
    if (!cadastroResponse.body.success) {
      console.log(`Mensagem: ${cadastroResponse.body.message}`);
    }

    // Teste de login
    console.log('5. Testando login...');
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        cpf: '111.333.555-77',
        senha: 'senhatest'
      });
    console.log(`POST /api/auth/login: ${loginResponse.status === 200 ? 'OK' : 'FALHA'}`);
    if (!loginResponse.body.success) {
      console.log(`Erro no login: ${loginResponse.body.message}`);
    }

    let userId = null;
    if (loginResponse.body.success && loginResponse.body.user) {
      userId = loginResponse.body.user.id;
      console.log(`Usuário logado: ${loginResponse.body.user.nome} (ID: ${userId})`);
    }

    // Teste de voos disponíveis
    console.log('6. Testando voos disponíveis...');
    const voosDisponiveisResponse = await request(app).get('/api/voos/disponiveis');
    console.log(`GET /api/voos/disponiveis: ${voosDisponiveisResponse.status === 200 ? 'OK' : 'FALHA'}`);
    if (voosDisponiveisResponse.body.success) {
      console.log(`Voos disponíveis: ${voosDisponiveisResponse.body.voos ? voosDisponiveisResponse.body.voos.length : 0}`);
    }

    // Teste de compra de passagem (apenas se temos usuário e voos)
    if (userId && voosDisponiveisResponse.body.success && voosDisponiveisResponse.body.voos.length > 0) {
      console.log('7. Testando compra de passagem...');
      const primeiroVoo = voosDisponiveisResponse.body.voos[0];
      
      const passagemResponse = await request(app)
        .post('/api/passagens/comprar')
        .send({
          voo_id: primeiroVoo.id,
          usuario_id: userId,
          formaPagamento: 'PIX',
          parcelas: 1,
          classe: 'economica'
        });
      
      console.log(`POST /api/passagens/comprar: ${passagemResponse.status === 200 ? 'OK' : 'FALHA'}`);
      if (passagemResponse.body.success) {
        console.log(`Passagem comprada: ${passagemResponse.body.passagemId}`);
        console.log(`Preço final: R$ ${passagemResponse.body.precoFinal}`);
      } else {
        console.log(`Erro na compra: ${passagemResponse.body.message}`);
      }
    } else {
      console.log('Pulando teste de compra - sem usuário ou voos disponíveis');
    }

    // Teste de listagem de usuários
    console.log('8. Testando listagem de usuários...');
    const usuariosResponse = await request(app).get('/api/usuarios');
    console.log(`GET /api/usuarios: ${usuariosResponse.status === 200 ? 'OK' : 'FALHA'}`);
    if (usuariosResponse.body.success) {
      console.log(`Total de usuários: ${usuariosResponse.body.usuarios ? usuariosResponse.body.usuarios.length : 0}`);
    }

    // Teste de pilotos disponíveis
    console.log('9. Testando pilotos disponíveis...');
    const pilotosResponse = await request(app).get('/api/usuarios/pilotos/disponiveis');
    console.log(`GET /api/usuarios/pilotos/disponiveis: ${pilotosResponse.status === 200 ? 'OK' : 'FALHA'}`);
    if (pilotosResponse.body.success) {
      console.log(`Pilotos disponíveis: ${pilotosResponse.body.pilotos ? pilotosResponse.body.pilotos.length : 0}`);
    }

    // Teste de comissários disponíveis
    console.log('10. Testando comissários disponíveis...');
    const comissariosResponse = await request(app).get('/api/usuarios/comissarios/disponiveis');
    console.log(`GET /api/usuarios/comissarios/disponiveis: ${comissariosResponse.status === 200 ? 'OK' : 'FALHA'}`);
    if (comissariosResponse.body.success) {
      console.log(`Comissários disponíveis: ${comissariosResponse.body.comissarios ? comissariosResponse.body.comissarios.length : 0}`);
    }

    console.log('\nTodos os testes da API concluídos!');
    
  } catch (error) {
    console.error('\nErro durante os testes:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runAPITests();
}

module.exports = runAPITests;
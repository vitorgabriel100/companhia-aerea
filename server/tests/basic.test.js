const request = require('supertest');
const { db } = require('../models/database');

// Para desenvolvimento, teste contra servidor rodando
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:9000';

describe('TESTES BÁSICOS DA API', () => {
  
  test('Servidor deve responder na rota raiz', async () => {
    const response = await request(BASE_URL).get('/');
    expect(response.status).toBe(200);
  });

  test('API de voos deve retornar dados', async () => {
    const response = await request(BASE_URL).get('/api/voos');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.voos)).toBe(true);
  });

  test('API de autenticação deve estar funcionando', async () => {
    const response = await request(BASE_URL)
      .post('/api/auth/login')
      .send({
        cpf: '00000000000', // CPF que não existe
        senha: '1234'
      });
    
    // Mesmo com credenciais inválidas, a API deve responder
    expect([200, 400, 404]).toContain(response.status);
  });

  test('Formas de pagamento devem estar disponíveis', async () => {
    const response = await request(BASE_URL)
      .get('/api/pagamento/formas-disponiveis');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
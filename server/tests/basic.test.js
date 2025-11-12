const request = require('supertest');
const app = require('../server');

describe('Testes Básicos da API', () => {
  test('Servidor deve estar rodando', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
  });

  test('Rota de saúde da API', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
  });
});
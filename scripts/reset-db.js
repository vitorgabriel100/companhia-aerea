const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Em scripts/reset-db.js
const dbPath = path.join(__dirname, '..', 'server', 'database.sqlite');

console.log('🔄 REINICIANDO BANCO DE DADOS (LIMPO)...');

// Remove o arquivo do banco se existir
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('✅ Banco de dados anterior removido');
} else {
  console.log('ℹ️  Nenhum banco anterior encontrado, criando novo...');
}

// Cria novo banco
const db = new sqlite3.Database(dbPath);

// Configurar timeout longo para operações
db.configure("busyTimeout", 3000);

db.serialize(() => {
  console.log('\n📊 CRIANDO ESTRUTURA DAS TABELAS...');

  // ========== TABELA DE USUÁRIOS ==========
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('cliente', 'comissario', 'piloto', 'diretor')),
    matricula TEXT UNIQUE,
    email TEXT,
    telefone TEXT,
    endereco TEXT,
    data_nascimento TEXT,
    data_admissao TEXT,
    salario DECIMAL(10,2),
    status TEXT DEFAULT 'ativo',
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  console.log('✅ Tabela USUARIOS criada');

  // ========== TABELA DE AERONAVES ==========
  db.run(`CREATE TABLE IF NOT EXISTS aeronaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    modelo TEXT NOT NULL,
    codigo TEXT UNIQUE NOT NULL,
    capacidade INTEGER NOT NULL,
    fabricante TEXT,
    ano_fabricacao INTEGER,
    status TEXT DEFAULT 'disponivel',
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  console.log('✅ Tabela AERONAVES criada');

  // ========== TABELA DE VOOS ==========
  db.run(`CREATE TABLE IF NOT EXISTS voos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL,
    origem TEXT NOT NULL,
    destino TEXT NOT NULL,
    data_partida TEXT NOT NULL,
    hora_partida TEXT NOT NULL,
    data_chegada TEXT NOT NULL,
    hora_chegada TEXT NOT NULL,
    aeronave_id INTEGER,
    piloto_id INTEGER,
    co_piloto_id INTEGER,
    preco_base DECIMAL(10,2) NOT NULL,
    assentos_disponiveis INTEGER NOT NULL,
    status TEXT DEFAULT 'agendado',
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (aeronave_id) REFERENCES aeronaves (id),
    FOREIGN KEY (piloto_id) REFERENCES usuarios (id),
    FOREIGN KEY (co_piloto_id) REFERENCES usuarios (id)
  )`);
  console.log('✅ Tabela VOOS criada');

  // ========== TABELA DE VOOS ATRIBUÍDOS (NOVA) ==========
  db.run(`CREATE TABLE IF NOT EXISTS voos_atribuidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    piloto_id INTEGER NOT NULL,
    numero_voo TEXT,
    origem TEXT NOT NULL,
    destino TEXT NOT NULL,
    data_partida TEXT NOT NULL,
    horario_partida TEXT NOT NULL,
    status TEXT DEFAULT 'Agendado',
    data_atribuicao DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (piloto_id) REFERENCES usuarios(id)
  )`);
  console.log('✅ Tabela VOOS_ATRIBUIDOS criada');

  // ========== TABELA DE TRIPULAÇÃO DE VOO ==========
  db.run(`CREATE TABLE IF NOT EXISTS tripulacao_voo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voo_id INTEGER NOT NULL,
    comissario_id INTEGER NOT NULL,
    funcao TEXT NOT NULL,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (voo_id) REFERENCES voos (id),
    FOREIGN KEY (comissario_id) REFERENCES usuarios (id)
  )`);
  console.log('✅ Tabela TRIPULACAO_VOO criada');

  // ========== TABELA DE FORMAS DE PAGAMENTO ==========
  db.run(`CREATE TABLE IF NOT EXISTS formas_pagamento (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT UNIQUE NOT NULL,
    parcelas_maximas INTEGER NOT NULL,
    ativo BOOLEAN DEFAULT 1,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  console.log('✅ Tabela FORMAS_PAGAMENTO criada');

  // ========== TABELA DE PASSAGENS ==========
  db.run(`CREATE TABLE IF NOT EXISTS passagens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voo_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    assento TEXT NOT NULL,
    forma_pagamento TEXT NOT NULL,
    parcelas INTEGER DEFAULT 1,
    preco_final DECIMAL(10,2) NOT NULL,
    classe TEXT DEFAULT 'economica',
    data_compra DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'confirmada',
    FOREIGN KEY (voo_id) REFERENCES voos (id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
  )`);
  console.log('✅ Tabela PASSAGENS criada');

  // ========== TABELA DE CHECK-IN ==========
  db.run(`CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    passagem_id INTEGER NOT NULL,
    data_checkin DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'concluido',
    bagagens INTEGER DEFAULT 0,
    observacoes TEXT,
    FOREIGN KEY (passagem_id) REFERENCES passagens (id)
  )`);
  console.log('✅ Tabela CHECKINS criada');

  // ========== TABELA DE ESCALAS ==========
  db.run(`CREATE TABLE IF NOT EXISTS escalas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    funcionario_id INTEGER NOT NULL,
    voo_id INTEGER NOT NULL,
    data_escala TEXT NOT NULL,
    funcao TEXT NOT NULL,
    status TEXT DEFAULT 'agendada',
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (funcionario_id) REFERENCES usuarios (id),
    FOREIGN KEY (voo_id) REFERENCES voos (id)
  )`);
  console.log('✅ Tabela ESCALAS criada');

  console.log('\n📥 INSERINDO DADOS DE CONFIGURAÇÃO (SEM USUÁRIOS)...');

  // ========== FORMAS DE PAGAMENTO ==========
  const formasPagamento = [
    { nome: 'Cartão de Crédito', parcelas_maximas: 18 },
    { nome: 'PIX', parcelas_maximas: 1 },
    { nome: 'Boleto Bancário', parcelas_maximas: 10 }
  ];

  formasPagamento.forEach(forma => {
    db.run(
      "INSERT INTO formas_pagamento (nome, parcelas_maximas) VALUES (?, ?)",
      [forma.nome, forma.parcelas_maximas]
    );
  });
  console.log('✅ Formas de pagamento inseridas');

  // ========== AERONAVES ==========
  const aeronaves = [
    {
      modelo: 'Boeing 737-800',
      codigo: 'B738001',
      capacidade: 186,
      fabricante: 'Boeing',
      ano_fabricacao: 2018
    },
    {
      modelo: 'Airbus A320',
      codigo: 'A320001',
      capacidade: 180,
      fabricante: 'Airbus',
      ano_fabricacao: 2019
    },
    {
      modelo: 'Embraer E195',
      codigo: 'E195001',
      capacidade: 124,
      fabricante: 'Embraer',
      ano_fabricacao: 2020
    }
  ];

  aeronaves.forEach(aeronave => {
    db.run(
      "INSERT INTO aeronaves (modelo, codigo, capacidade, fabricante, ano_fabricacao) VALUES (?, ?, ?, ?, ?)",
      [aeronave.modelo, aeronave.codigo, aeronave.capacidade, aeronave.fabricante, aeronave.ano_fabricacao]
    );
  });
  console.log(' Aeronaves inseridas');

  console.log('\n BANCO DE DADOS REINICIADO COM SUCESSO!');
  console.log('==========================================');
  console.log('  ATENÇÃO: O banco está limpo (sem usuários).');
  console.log('   Utilize a tela de cadastro ou scripts manuais para criar usuários.');
  console.log('     Aeronaves: 3');
  console.log('    Formas de pagamento: 3');
  console.log('==========================================');

  db.close();
});

// Tratamento de erros
db.on('error', (err) => {
  console.error('❌ Erro no banco de dados:', err);
});

process.on('exit', () => {
  db.close();
});
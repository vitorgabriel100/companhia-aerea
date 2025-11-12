const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Em scripts/reset-db.js
const dbPath = path.join(__dirname, '..', 'server', 'database.sqlite');

console.log('🔄 REINICIANDO BANCO DE DADOS COMPLETO...');

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
  console.log('\n📊 CRIANDO TABELAS...');

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

  console.log('\n📥 INSERINDO DADOS INICIAIS...');

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
  console.log('✅ Aeronaves inseridas');

  // ========== USUÁRIOS INICIAIS ==========
  const usuarios = [
    // Clientes
    {
      nome: 'João Silva',
      cpf: '123.456.789-00',
      senha: '1234',
      tipo: 'cliente',
      email: 'joao@email.com',
      telefone: '(11) 99999-9999',
      endereco: 'Rua A, 123 - São Paulo, SP',
      data_nascimento: '1990-05-15'
    },
    {
      nome: 'Maria Santos',
      cpf: '987.654.321-00',
      senha: '1234',
      tipo: 'cliente',
      email: 'maria@email.com',
      telefone: '(11) 88888-8888',
      endereco: 'Av. B, 456 - Rio de Janeiro, RJ',
      data_nascimento: '1985-08-22'
    },
    // Comissários
    {
      nome: 'Carlos Comissário',
      cpf: '111.222.333-44',
      senha: '1234',
      tipo: 'comissario',
      matricula: 'COM001',
      email: 'carlos@companhiaaerea.com',
      telefone: '(11) 77777-7777',
      data_admissao: '2020-03-10',
      salario: 4500.00
    },
    {
      nome: 'Ana Comissária',
      cpf: '222.333.444-55',
      senha: '1234',
      tipo: 'comissario',
      matricula: 'COM002',
      email: 'ana@companhiaaerea.com',
      telefone: '(11) 66666-6666',
      data_admissao: '2021-07-15',
      salario: 4200.00
    },
    // Pilotos
    {
      nome: 'Paulo Piloto',
      cpf: '555.666.777-88',
      senha: '1234',
      tipo: 'piloto',
      matricula: 'PIL001',
      email: 'paulo@companhiaaerea.com',
      telefone: '(11) 55555-5555',
      data_admissao: '2018-11-20',
      salario: 15000.00
    },
    {
      nome: 'Fernanda Piloto',
      cpf: '666.777.888-99',
      senha: '1234',
      tipo: 'piloto',
      matricula: 'PIL002',
      email: 'fernanda@companhiaaerea.com',
      telefone: '(11) 44444-4444',
      data_admissao: '2019-05-30',
      salario: 14000.00
    },
    // Diretor
    {
      nome: 'Pedro Diretor',
      cpf: '999.888.777-66',
      senha: '1234',
      tipo: 'diretor',
      matricula: 'DIR001',
      email: 'pedro@companhiaaerea.com',
      telefone: '(11) 33333-3333',
      data_admissao: '2015-01-15',
      salario: 25000.00
    }
  ];

  usuarios.forEach(usuario => {
    const query = `
      INSERT INTO usuarios (
        nome, cpf, senha, tipo, matricula, email, telefone, endereco, 
        data_nascimento, data_admissao, salario
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      usuario.nome,
      usuario.cpf,
      usuario.senha,
      usuario.tipo,
      usuario.matricula || null,
      usuario.email || null,
      usuario.telefone || null,
      usuario.endereco || null,
      usuario.data_nascimento || null,
      usuario.data_admissao || null,
      usuario.salario || null
    ];

    db.run(query, params);
  });
  console.log('✅ Usuários iniciais inseridos');

  // Aguardar inserção dos usuários para inserir voos
  setTimeout(() => {
    // ========== VOOS INICIAIS ==========
    const voos = [
      {
        codigo: 'FL101',
        origem: 'São Paulo (GRU)',
        destino: 'Rio de Janeiro (GIG)',
        data_partida: '2024-12-20',
        hora_partida: '08:00',
        data_chegada: '2024-12-20',
        hora_chegada: '09:30',
        aeronave_id: 1,
        piloto_id: 5, // Paulo Piloto
        co_piloto_id: 6, // Fernanda Piloto
        preco_base: 299.99,
        assentos_disponiveis: 186
      },
      {
        codigo: 'FL102',
        origem: 'Rio de Janeiro (GIG)',
        destino: 'São Paulo (GRU)',
        data_partida: '2024-12-20',
        hora_partida: '11:00',
        data_chegada: '2024-12-20',
        hora_chegada: '12:30',
        aeronave_id: 2,
        piloto_id: 6, // Fernanda Piloto
        co_piloto_id: 5, // Paulo Piloto
        preco_base: 299.99,
        assentos_disponiveis: 180
      },
      {
        codigo: 'FL201',
        origem: 'São Paulo (GRU)',
        destino: 'Belo Horizonte (CNF)',
        data_partida: '2024-12-21',
        hora_partida: '14:00',
        data_chegada: '2024-12-21',
        hora_chegada: '15:15',
        aeronave_id: 3,
        piloto_id: 5, // Paulo Piloto
        co_piloto_id: 6, // Fernanda Piloto
        preco_base: 199.99,
        assentos_disponiveis: 124
      },
      {
        codigo: 'FL301',
        origem: 'São Paulo (GRU)',
        destino: 'Salvador (SSA)',
        data_partida: '2024-12-22',
        hora_partida: '07:00',
        data_chegada: '2024-12-22',
        hora_chegada: '09:30',
        aeronave_id: 1,
        piloto_id: 6, // Fernanda Piloto
        co_piloto_id: 5, // Paulo Piloto
        preco_base: 599.99,
        assentos_disponiveis: 186
      }
    ];

    voos.forEach(voo => {
      const query = `
        INSERT INTO voos (
          codigo, origem, destino, data_partida, hora_partida, 
          data_chegada, hora_chegada, aeronave_id, piloto_id, 
          co_piloto_id, preco_base, assentos_disponiveis
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(query, [
        voo.codigo, voo.origem, voo.destino, voo.data_partida, 
        voo.hora_partida, voo.data_chegada, voo.hora_chegada,
        voo.aeronave_id, voo.piloto_id, voo.co_piloto_id,
        voo.preco_base, voo.assentos_disponiveis
      ], function(err) {
        if (err) {
          console.error('❌ Erro ao inserir voo:', err);
        } else {
          // Adicionar tripulação para este voo
          const comissarios = [3, 4]; // Carlos e Ana
          comissarios.forEach(comissarioId => {
            db.run(
              "INSERT INTO tripulacao_voo (voo_id, comissario_id, funcao) VALUES (?, ?, ?)",
              [this.lastID, comissarioId, 'comissario']
            );
          });
        }
      });
    });
    console.log('✅ Voos iniciais inseridos');

    // ========== PASSAGENS DE EXEMPLO ==========
    setTimeout(() => {
      const passagens = [
        {
          voo_id: 1,
          usuario_id: 1, // João Silva
          assento: '12A',
          forma_pagamento: 'Cartão de Crédito',
          parcelas: 6,
          preco_final: 299.99,
          classe: 'economica'
        },
        {
          voo_id: 2,
          usuario_id: 2, // Maria Santos
          assento: '8B',
          forma_pagamento: 'PIX',
          parcelas: 1,
          preco_final: 284.99,
          classe: 'executiva'
        },
        {
          voo_id: 3,
          usuario_id: 1, // João Silva
          assento: '15C',
          forma_pagamento: 'Boleto Bancário',
          parcelas: 3,
          preco_final: 193.99,
          classe: 'economica'
        }
      ];

      passagens.forEach(passagem => {
        db.run(
          "INSERT INTO passagens (voo_id, usuario_id, assento, forma_pagamento, parcelas, preco_final, classe) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [passagem.voo_id, passagem.usuario_id, passagem.assento, passagem.forma_pagamento, passagem.parcelas, passagem.preco_final, passagem.classe]
        );
      });
      console.log('✅ Passagens de exemplo inseridas');

      console.log('\n🎉 BANCO DE DADOS REINICIADO COM SUCESSO!');
      console.log('==========================================');
      console.log('📊 RESUMO DA BASE:');
      console.log('   👥 Usuários: 7 (1 diretor, 2 pilotos, 2 comissários, 2 clientes)');
      console.log('   ✈️  Aeronaves: 3');
      console.log('   🛫 Voos: 4');
      console.log('   🎫 Passagens: 3');
      console.log('   💳 Formas de pagamento: 3');
      console.log('\n🔑 CREDENCIAIS DE TESTE:');
      console.log('   👑 Diretor: CPF 999.888.777-66 | Senha: 1234');
      console.log('   ✈️  Piloto: CPF 555.666.777-88 | Senha: 1234');
      console.log('   👨‍✈️ Comissário: CPF 111.222.333-44 | Senha: 1234');
      console.log('   👤 Cliente: CPF 123.456.789-00 | Senha: 1234');
      console.log('==========================================');

      db.close();
    }, 500);
  }, 500);
});

// Tratamento de erros
db.on('error', (err) => {
  console.error('❌ Erro no banco de dados:', err);
});

process.on('exit', () => {
  db.close();
});
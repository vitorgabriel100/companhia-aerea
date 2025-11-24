const { exec } = require('child_process');
const path = require('path');

console.log('Executando testes do sistema...\n');

// Executar Jest
const jestProcess = exec('npx jest tests/ --verbose', (error, stdout, stderr) => {
  console.log(stdout);
  if (error) {
    console.error('Erro nos testes:', error);
    return;
  }
  
  console.log('Todos os testes passaram!');
});

jestProcess.stdout.pipe(process.stdout);
jestProcess.stderr.pipe(process.stderr);
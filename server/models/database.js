const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Esta linha vai procurar o banco 'database.sqlite' na pasta 'server/'
const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Erro ao abrir o banco de dados:", err.message);
    } else {
        console.log("Conectado ao banco de dados 'server/database.sqlite' com sucesso.");
    }
});

function getDatabase() {
    return db;
}

module.exports = { db, getDatabase };
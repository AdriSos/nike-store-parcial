const mysql = require('mysql2');

// Ajusta usuario y password según tu configuración de XAMPP
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: '', 
    database: 'nike_store'
});

connection.connect((err) => {
    if (err) {
        console.error('Error conectando a la BD:', err);
        return;
    }
    console.log('Conectado a MySQL exitosamente');
});

module.exports = connection;
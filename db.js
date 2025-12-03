const mysql = require("mysql2");

// Debug: revisar variables de entorno
console.log("Valores de conexión a MySQL:");
console.log({
  host: process.env.MYSQL_URL ? process.env.MYSQL_URL.split("@")[1].split("/")[0].split(":")[0] : "mysql.railway.internal",
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQLPORT
});

// Crear conexión
const connection = mysql.createPool({
  host: process.env.MYSQL_URL ? process.env.MYSQL_URL.split("@")[1].split("/")[0].split(":")[0] : "mysql.railway.internal",
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQLPORT ? Number(process.env.MYSQLPORT) : 3306,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = connection;

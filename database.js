var mysql = require('mysql');
const config = require('./config.json');

var con = mysql.createConnection({
    host: config.dbIp,
    user: config.dbUser,
    password: config.dbPass,
    database: config.dbDatabase
  });
  
  con.connect(function(err) {
    if (err) throw err;
    console.log("Conectado com sucesso ao banco de dados do bot!");
  });

  exports.con = con;

  var server = mysql.createConnection({
    host: config.dbServerIp,
    user: config.dbServerUser,
    password: config.dbServerPass,
    database: config.dbServerDatabase
  });

  server.connect(function(err) {
    if (err) throw err;
    console.log("Conectado com sucesso ao banco de dados do servidor!");
  });

  exports.server = server;
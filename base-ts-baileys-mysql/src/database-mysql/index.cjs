'use strict';

var bot = require('@builderbot/bot');
var mysql = require('mysql2');

class MysqlAdapter extends bot.MemoryDB {
    constructor(_credentials) {
        super();
        this.listHistory = [];
        this.credentials = {
            host: null,
            user: null,
            database: null,
            password: null,
            port: 3306,
        };
        this.getPrevByNumber = async (from) => {
            return await new Promise((resolve, reject) => {
                const sql = `SELECT * FROM history WHERE phone='${from}' ORDER BY id DESC`;
                this.db.query(sql, (error, rows) => {
                    if (error) {
                        reject(error);
                    }
                    if (rows.length) {
                        const [row] = rows;
                        row.options = JSON.parse(row.options);
                        resolve(row);
                    }
                    if (!rows.length) {
                        resolve({});
                    }
                });
            });
        };
        this.save = async (ctx) => {
            const values = [[ctx.ref, ctx.keyword, ctx.answer, ctx.refSerialize, ctx.from, JSON.stringify(ctx.options)]];
            const sql = 'INSERT INTO history (ref, keyword, answer, refSerialize, phone, options) values ?';
            this.db.query(sql, [values], (err) => {
                if (err)
                    throw err;
            });
        };
        this.createTable = () => new Promise((resolve) => {
            const tableName = 'history';
            const sql = `CREATE TABLE ${tableName} 
            (id INT AUTO_INCREMENT PRIMARY KEY, 
            ref varchar(255) DEFAULT NULL,
            keyword varchar(255) NULL,
            answer longtext NULL,
            refSerialize varchar(255) NULL,
            phone varchar(255) NOT NULL,
            options longtext NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) 
            CHARACTER SET utf8mb4 COLLATE utf8mb4_General_ci`;
            this.db.query(sql, (err) => {
                if (err)
                    throw err;
                console.log(`Table ${tableName} created successfully`);
                resolve(true);
            });
        });
        this.checkTableExists = () => new Promise((resolve, reject) => {
            const sql = "SHOW TABLES LIKE 'history'";
        
            // Obtenemos una conexión del pool
            this.pool.getConnection((err, connection) => {
                if (err) {
                    return reject(err); // Rechazamos si hay un error al obtener la conexión
                }
        
                // Ejecutamos la consulta usando la conexión obtenida
                connection.query(sql, (err, rows) => {
                    if (err) {
                        connection.release(); // Liberamos la conexión en caso de error
                        return reject(err); // Rechazamos si hay un error al ejecutar la consulta
                    }
        
                    if (!rows.length) {
                        this.createTable(); // Creamos la tabla si no existe
                    }
        
                    connection.release(); // Liberamos la conexión después de usarla
                    resolve(!!rows.length); // Resolvemos con true o false dependiendo de si la tabla existe
                });
            });
        });
        


        this.credentials = _credentials;
        this.init().then();
    }
    async init() {
        this.pool = mysql.createPool(this.credentials); // Creamos un pool de conexiones
        this.pool.getConnection(async (error, connection) => { // Obtenemos una conexión del pool
            if (!error) {
                console.log(`Successful database connection request`);
                await this.checkTableExists(); // Realizamos la operación si la conexión es exitosa
                connection.release(); // Liberamos la conexión al pool cuando terminamos
            }
            if (error) {
                console.log(`Failed connection request ${error.stack}`);
            }
        });
    }
    
}

exports.MysqlAdapter = MysqlAdapter;

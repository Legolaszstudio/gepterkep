const PORT = 3001;

const fastifyStatic = require('@fastify/static');
const fastify = require('fastify')({
    logger: true,
    bodyLimit: 1073741824,
});
const path = require('path');
const fs = require('fs');

const dbPath = "./gepterkep_db.db"
const sqlite3 = require('sqlite3').verbose();
const sqlite = require('sqlite');

fastify.get('/api/getAvailableMaps', require('./getAvailableMaps').getAvailableMaps);
fastify.post('/api/upload', require('./upload').uploadHandler);
fastify.post('/api/create', require('./create').creationHandler);
fastify.post('/api/delete', require('./delete').deletionHandler);
fastify.post('/api/rename', require('./rename').renameHandler);



fastify.addHook('preHandler', (_req, reply, done) => {
    //FIXME: testing use only
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Headers", "*");
    done()
});

fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../public'),
});

fastify.setNotFoundHandler((req, res) => {
    // Preflight pass
    if (req.method === 'OPTIONS') {
        return res.status(200).send('OK');
    }


    // API 404
    if (req.raw.url && req.raw.url.startsWith("/api")) {
        return res.status(404).send({
            success: false,
            error: "404 Not Found",
        });
    }

    // React SPA
    return res.status(200).sendFile('index.html');
});


fastify.listen({ port: PORT, host: '0.0.0.0' }, async function (err, address) {
    if (err) {
        fastify.log.error(err);
        process.exit(1);
    }
    if (!fs.existsSync(dbPath)) {
        console.warn("Database not found, making one");
        exports.db = new sqlite3.Database(dbPath, (errdb) => {
            if (errdb) {
                console.error(errdb.message);
                throw Error(errdb);
            }
        });
        exports.db.close();
    }
    exports.db = await sqlite.open({
        filename: dbPath,
        driver: sqlite3.cached.Database,
    });
    await exports.db.run('CREATE TABLE IF NOT EXISTS Maps (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,"create" INTEGER NOT NULL,"edit" INTEGER NOT NULL);');
    fastify.log.info(`Server listening on ${address}`);
});
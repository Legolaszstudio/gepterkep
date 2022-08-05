const PORT = 3001;
const users = { //"username": "password",
    'admin': 'admin',
};
const origin = 'http://localhost:3000';

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

const authenticate = { realm: 'gepmap' }
function validate(username, password, _req, reply, done) {
    if (username in users) {
        if (password === users[username]) {
            reply.header("Access-Control-Allow-Origin", origin);
            reply.header("Access-Control-Allow-Headers", "Accept, Content-Type, Authorization, Referer, User-Agent");
            reply.header("Access-Control-Allow-Credentials", "true");
            done();
            return;
        }
    }

    done(new Error('Invalid username or password!'));
}
fastify.register(require('@fastify/basic-auth'), { validate, authenticate })

fastify.after(() => {
    fastify.route({
        method: 'GET',
        url: '/api/getAvailableMaps',
        handler: require('./getAvailableMaps').getAvailableMaps
    });
    fastify.route({
        method: 'POST',
        url: '/api/upload',
        handler: require('./upload').uploadHandler,
        onRequest: fastify.basicAuth,
    });
    fastify.route({
        method: 'POST',
        url: '/api/create',
        handler: require('./create').creationHandler,
        onRequest: fastify.basicAuth,
    });
    fastify.route({
        method: 'POST',
        url: '/api/delete',
        handler: require('./delete').deletionHandler,
        onRequest: fastify.basicAuth,
    });
    fastify.route({
        method: 'POST',
        url: '/api/rename',
        handler: require('./rename').renameHandler,
        onRequest: fastify.basicAuth,
    });
});


fastify.addHook('onSend', (_req, reply, _payload, done) => {
    reply.header("Access-Control-Allow-Origin", origin);
    reply.header("Access-Control-Allow-Headers", "Accept, Content-Type, Authorization, Referer, User-Agent");
    reply.header("Access-Control-Allow-Credentials", "true");
    done();
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
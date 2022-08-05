const fs = require('fs');
const path = require('path');
const index = require('./index');

exports.creationHandler = async (req, res) => {
    const date = Date.now();

    const dbRes = await index.db.run(
        "INSERT INTO Maps (name,\"create\",edit) VALUES (?,?,?);",
        [
            req.body.name,
            date,
            date
        ],
    );

    const filePath = path.join(__dirname, '../public/maps', `${dbRes.lastID}.gepmap`);

    fs.writeFileSync(filePath, req.body.map);

    return res.status(201).send('Created');
}
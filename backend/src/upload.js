const fs = require('fs');
const path = require('path');
const index = require('./index');

/** Update existing project */
exports.uploadHandler = async (req, res) => {
    const filePath = path.join(__dirname, '../public/maps', `${req.body.id}.gepmap`);

    fs.writeFileSync(filePath, req.body.map);
    await index.db.run('UPDATE maps SET "edit" = ? WHERE id = ?', [
        Date.now(),
        req.body.id,
    ]);

    return res.status(200).send('Saved');
}
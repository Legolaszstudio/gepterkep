const index = require('./index');

exports.renameHandler = async (req, res) => {
    await index.db.run('UPDATE Maps SET name = ? WHERE id = ?', [req.body.name, req.body.id]);

    return res.status(200).send('Renamed');
}
const fs = require('fs');
const path = require('path');
const index = require('./index');

/** Remove files and db entries for project */
exports.deletionHandler = async (req, res) => {
    const filePath = path.join(__dirname, '../public/maps', `${req.body.id}.gepmap`);

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await index.db.run('DELETE FROM Maps WHERE id = ?', [req.body.id]);

    return res.status(200).send('Deleted');
}
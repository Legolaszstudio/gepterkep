const index = require("./index");

/** Select all projects from database */
exports.getAvailableMaps = async (req, res) => {
    const result = await index.db.all("SELECT * FROM Maps ORDER BY name;");
    res.status(200).send(result);
}
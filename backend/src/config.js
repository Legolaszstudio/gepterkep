exports.PORT = 3001; //Server port
exports.origin = `http://localhost:${exports.PORT}`; // Frontend url

exports.loginReq = true; // Require username and password to modify data
// If above is true, these are the users with passwords in plaintext
exports.users = { //"username": "password",
    'admin': 'admin',
};
const jwt = require("jsonwebtoken");
const env = require("../config/env");

/**
 * Sign a JWT with the given payload.
 * @param {object} payload - typically { id, role }
 * @returns {string} signed JWT
 */
function generateToken(payload) {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

/**
 * Verify a JWT and return the decoded payload.
 * Throws jsonwebtoken's error if invalid/expired.
 */
function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = { generateToken, verifyToken };

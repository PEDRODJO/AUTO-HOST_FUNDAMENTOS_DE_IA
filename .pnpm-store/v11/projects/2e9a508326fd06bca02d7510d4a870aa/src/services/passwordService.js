const crypto = require('node:crypto');
const { promisify } = require('node:util');
const pbkdf2 = promisify(crypto.pbkdf2);

// Strategy: password derivation can be swapped without changing callers.
class Pbkdf2Sha512Strategy {
  constructor(iterations = 600000, keyLength = 64) {
    this.iterations = iterations; this.keyLength = keyLength; this.digest = 'sha512';
  }
  async derive(password, salt) {
    const pepper = process.env.PASSWORD_PEPPER || '';
    return pbkdf2(`${password}${pepper}`, salt, this.iterations, this.keyLength, this.digest);
  }
}

const strategy = new Pbkdf2Sha512Strategy();
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await strategy.derive(password, salt);
  return { salt: salt.toString('hex'), hash: hash.toString('hex'), iterations: strategy.iterations };
}
async function verifyPassword(password, saltHex, hashHex, iterations) {
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await new Pbkdf2Sha512Strategy(Number(iterations)).derive(password, Buffer.from(saltHex, 'hex'));
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
module.exports = { hashPassword, verifyPassword };

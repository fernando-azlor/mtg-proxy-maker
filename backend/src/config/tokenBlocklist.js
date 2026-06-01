// Blocklist en memoria de tokens JWT revocados (logout antes de expiración)
// Cada entrada: token → timestamp de expiración (ms)
// Los tokens se limpian automáticamente cuando expiran.

const blocklist = new Map();

const addToken = (token, expiresAtMs) => {
  blocklist.set(token, expiresAtMs);
  _cleanup();
};

const isBlocked = (token) => {
  const expiresAt = blocklist.get(token);
  if (expiresAt === undefined) return false;
  if (Date.now() > expiresAt) {
    blocklist.delete(token);
    return false;
  }
  return true;
};

// Elimina tokens expirados para evitar crecimiento ilimitado de memoria
const _cleanup = () => {
  const now = Date.now();
  for (const [token, expiresAt] of blocklist) {
    if (now > expiresAt) blocklist.delete(token);
  }
};

module.exports = { addToken, isBlocked };

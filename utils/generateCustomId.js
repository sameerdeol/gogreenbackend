function generateCustomId(roleId) {
  const prefixMap = {
    3: 'VEN',  // Vendor
    4: 'RID',  // Rider
    5: 'USR',  // Customer
  };

  const prefix = prefixMap[roleId] || 'USR'; // fallback if unknown role
  const now = new Date();
  const datetime =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');

  const random = Math.random().toString(36).substring(2, 5).toUpperCase();

  return prefix + datetime + random;
}

module.exports = generateCustomId;

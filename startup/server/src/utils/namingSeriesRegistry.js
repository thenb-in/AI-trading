// Masters that number their new rows from a naming series. A model lands here when
// attachNamingSeries runs on it at boot, so the naming series screen only offers masters
// something will actually read.

const masters = new Map(); // master -> the field its code is written to

function registerNamingSeriesMaster(master, field) {
  masters.set(master, field);
}

function isNamingSeriesMaster(master) {
  return masters.has(master);
}

function getNamingSeriesMasters() {
  return [...masters.entries()].map(([master, field]) => ({ master, field }));
}

module.exports = { registerNamingSeriesMaster, isNamingSeriesMaster, getNamingSeriesMasters };

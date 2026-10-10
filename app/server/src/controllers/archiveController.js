// Thin controller: no req/res, no models — just delegates to the service.
const historyArchiveService = require('../services/historyArchiveService');

async function getStatus() {
  return historyArchiveService.archiveStatus();
}

async function archiveIndex(symbol, days) {
  return historyArchiveService.archiveIndexCandles(symbol, days);
}

async function archiveOptions(symbol) {
  return historyArchiveService.archiveOptionCandles(symbol);
}

module.exports = {
  getStatus,
  archiveIndex,
  archiveOptions
};

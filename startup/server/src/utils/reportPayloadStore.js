// On-disk store for computed report payloads, registered in NBnext Drive.
//
// A report run's rows never go into Postgres — a wide detailed-attendance run is
// tens of megabytes of JSON, and as a JSONB column it would be TOASTed on write
// and pulled back through Sequelize into app-server memory just to be handed
// straight out again. It is written as gzipped JSON instead, and the API streams
// the file back still compressed, so the app server never parses it.
//
// Drive owns the file record: this module gzips the bytes and hands the relative
// path to nbnextDriveService, which creates the row. Every file the application
// stores therefore lives in one registry with one lifecycle, rather than this
// feature keeping a private pile of its own. Runs link to their file through
// Drive's objectName/objectId (`ReportRun` / run id), so the relationship is
// visible from the Drive side too.
//
// Access control is Drive's: reads and deletes go through its service, which
// scopes by company and owner. The bytes sit under UPLOADS_DIR, which
// express.static currently serves — a known, accepted exposure pending the nginx
// layer that will require an authenticated, permitted user for these files.
//
// The runner process writes these files and the app server reads them, so both
// must resolve UPLOADS_DIR to the same filesystem. That holds for the current
// deploy (same host, same repo root); if the runner is ever moved to its own
// machine, writes have to move back behind an API call.

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const env = require('../config/env');
const logger = require('../../logger');
const nbnextDriveService = require('../services/nbnextDriveService');
const {
  REPORT_RUN_PAYLOAD_DIR,
  REPORT_RUN_PAYLOAD_MIME,
  REPORT_RUN_DRIVE_OBJECT,
  REPORT_RUN_LOG_PREFIX
} = require('../constants/reportRuns');

const gzip = promisify(zlib.gzip);

function relativePathFor(runId, companyId) {
  return path.posix.join(REPORT_RUN_PAYLOAD_DIR, String(companyId), `${runId}.json.gz`);
}

/**
 * Gzip a computed payload to disk and register it in Drive.
 *
 * Returns the Drive file id — that, not a path, is what the run row stores, so
 * where the bytes live stays Drive's business.
 */
async function writePayload({ runId, companyId, userId, payload }) {
  const relativePath = relativePathFor(runId, companyId);
  const absolutePath = path.join(env.UPLOADS_DIR, relativePath);
  await fsp.mkdir(path.dirname(absolutePath), { recursive: true });

  const buffer = await gzip(Buffer.from(JSON.stringify(payload ?? {})));
  await fsp.writeFile(absolutePath, buffer);

  const file = await nbnextDriveService.createFile(
    {
      fileName: `${runId}.json.gz`,
      filePath: relativePath,
      fileSize: buffer.length,
      mimeType: REPORT_RUN_PAYLOAD_MIME,
      objectName: REPORT_RUN_DRIVE_OBJECT,
      objectId: String(runId)
    },
    userId,
    companyId
  );

  logger.debug(`${REPORT_RUN_LOG_PREFIX} wrote payload ${relativePath} bytes=${buffer.length} driveFileId=${file.id}`);
  return { driveFileId: file.id, bytes: buffer.length };
}

/**
 * Read stream over a stored payload, resolved through Drive.
 *
 * `userId` is the run's owner rather than the caller: Drive scopes by creator,
 * and the file was created as that user. Returns null when the file is gone — a
 * purge can win a race with an open request, and that is a 404, not a crash.
 */
async function payloadStream({ driveFileId, companyId, userId }) {
  if (!driveFileId) {
    return null;
  }
  try {
    const { filePath } = await nbnextDriveService.getFileStream(driveFileId, companyId, userId);
    return fs.createReadStream(filePath);
  } catch (err) {
    logger.warn(`${REPORT_RUN_LOG_PREFIX} payload unavailable driveFileId=${driveFileId}: ${err.message}`);
    return null;
  }
}

/**
 * Delete payloads through Drive, which removes both its row and the bytes.
 * A missing file is not an error — the run row is the record of truth.
 */
async function removePayloads(files = []) {
  let removed = 0;
  for (const { driveFileId, companyId, userId } of files) {
    if (!driveFileId) {
      continue;
    }
    try {
      await nbnextDriveService.deleteFile(driveFileId, companyId, userId);
      removed += 1;
    } catch (err) {
      logger.warn(`${REPORT_RUN_LOG_PREFIX} failed to delete payload driveFileId=${driveFileId}: ${err.message}`);
    }
  }
  return removed;
}

module.exports = { writePayload, payloadStream, removePayloads };

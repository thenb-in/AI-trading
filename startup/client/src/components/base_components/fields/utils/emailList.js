/**
 * Client mirror of the server's utils/emailListUtils.js.
 *
 * Customer and supplier email fields hold a comma-separated list of addresses
 * in one string, so form state stays a plain string and existing change
 * handlers / payload builders keep working unchanged.
 */

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emailListSeparator = ', ';

/** Splits on comma or semicolon so pasted spreadsheet values work too. */
function splitEmailList(value) {
  if (value === null || value === undefined) {
    return [];
  }
  return String(value)
    .split(/[,;]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/** De-duplicates case-insensitively but preserves the entered casing. */
function parseEmailList(value) {
  const seen = new Set();
  const result = [];
  for (const entry of splitEmailList(value)) {
    const key = entry.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(entry);
    }
  }
  return result;
}

function isValidEmail(value) {
  return emailPattern.test(String(value ?? '').trim());
}

function findInvalidEmails(value) {
  return parseEmailList(value).filter((entry) => !isValidEmail(entry));
}

function joinEmailList(emails) {
  return (emails || []).join(emailListSeparator);
}

export { splitEmailList, parseEmailList, isValidEmail, findInvalidEmails, joinEmailList };

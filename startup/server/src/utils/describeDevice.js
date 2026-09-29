/**
 * "Chrome on Windows" / "Safari on iPhone" — a short, human label to recognise
 * a device by, parsed from a User-Agent string
 */
const describeDevice = (userAgent) => {
  if (!userAgent) {
    return 'Unknown device';
  }
  const browser = ['Edg', 'Chrome', 'Firefox', 'Safari'].find((name) => userAgent.includes(name));
  const platform = ['iPhone', 'iPad', 'Android', 'Windows', 'Mac', 'Linux'].find((name) => userAgent.includes(name));
  return [browser === 'Edg' ? 'Edge' : browser, platform].filter(Boolean).join(' on ') || userAgent.slice(0, 40);
};

module.exports = { describeDevice };

'use strict';

// Computes a deterministic machine fingerprint used to bind a license to
// a single physical (or VM-stable) host.
//
// Composition: SHA-256 of canonical(sorted unique physical MAC addresses +
// stable OS machine-id). All inputs are lowercased and joined with `|` so
// re-ordering by the OS doesn't change the result.
//
// Why these inputs?
//   - MACs: hard to spoof in a meaningful way across NICs, captured at
//     OS level, persist across reboots. Virtual / loopback interfaces are
//     excluded — they're not unique and would let two VMs collide.
//   - machine-id: Linux's `/etc/machine-id` (and `/var/lib/dbus/machine-id`
//     fallback). On Windows we read the registry MachineGuid. On macOS we
//     use `IOPlatformUUID`. Survives NIC swaps; combined with MACs makes
//     fingerprint resilient to either-but-not-both changing.
//
// Both required: cloning a VM image to a fresh host changes MAC (different
// virtualized NIC) AND should change machine-id (cloud-init regen). A
// careless clone that copies both is a deliberate attempt to evade
// licensing, which we punish with a verification failure.
//
// Containerised installs (see deploy/docker/) are the one case where
// the process genuinely cannot see the host: every container gets a synthetic
// docker-bridge MAC and a per-image /etc/machine-id, so compute() would bind
// the license to a container that is thrown away on the next update. There the
// installer stamps the real host's NICs + machine-id into HOST_MACHINE_FILE and
// we read our inputs from it instead — same filter, same canonical form, so a
// token issued against a bare-metal install keeps verifying after the move to
// Docker.

const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const env = require('../../../config/env');
const { LICENSE_ERRORS } = require('../../../constants/license');

const VIRTUAL_PREFIXES = [
  '00:00:00:00:00:00',
  '02:42:', // docker bridge
  '52:54:00:', // libvirt KVM
  '00:15:5d:', // hyper-v
  '00:50:56:', // vmware
  '00:0c:29:',
  '00:1c:14:'
];

function isPhysicalMac(mac, ifaceName) {
  if (!mac) {
    return false;
  }
  const lower = mac.toLowerCase();
  if (VIRTUAL_PREFIXES.some(p => lower.startsWith(p))) {
    return false;
  }
  // Skip loopback and common virtual interface names.
  if (/^(lo|docker|veth|virbr|vboxnet|tun|tap|br-|cni|flannel)/i.test(ifaceName || '')) {
    return false;
  }
  return true;
}

/**
 * Reads HOST_MACHINE_FILE when it is configured. Shape:
 *
 *   { "interfaces": [{ "name": "Ethernet", "mac": "aa:bb:cc:dd:ee:ff" }],
 *     "machineId": "b1f0…" }
 *
 * The file lists every interface the host reports — it is deliberately NOT
 * pre-filtered, so the virtual-NIC rules below stay the single source of truth
 * and a containerised install produces the exact same fingerprint the same
 * hardware would produce natively.
 *
 * Configured-but-unreadable is fatal: falling back to the container's own
 * (useless) identity would silently rebind the license.
 */
function readHostMachineFile() {
  const file = env.HOST_MACHINE_FILE;
  if (!file) {
    return null;
  }
  if (!fs.existsSync(file)) {
    throw new Error(`HOST_MACHINE_FILE points at ${file}, which does not exist — re-run the installer to stamp this host's identity`);
  }
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  return {
    interfaces: (parsed.interfaces || []).map(i => ({
      name: i.name,
      // Windows reports MACs as AA-BB-CC-DD-EE-FF; canonicalise to the
      // colon-lowercase form os.networkInterfaces() uses on every platform.
      mac: String(i.mac || '').replace(/-/g, ':').toLowerCase(),
      internal: false
    })),
    machineId: String(parsed.machineId || '').toLowerCase() || null
  };
}

/**
 * Flattens whichever identity source we're using into one list of
 * `{ name, mac, internal }`, so the filtering below is written once.
 */
function listInterfaces(host) {
  if (host) {
    return host.interfaces;
  }
  const flat = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      flat.push({ name, mac: a.mac, internal: a.internal });
    }
  }
  return flat;
}

function getPhysicalMacAddresses(host) {
  const macs = new Set();
  for (const { name, mac, internal } of listInterfaces(host)) {
    if (internal) {
      continue;
    }
    if (!isPhysicalMac(mac, name)) {
      continue;
    }
    macs.add(mac.toLowerCase());
  }
  return [...macs].sort();
}

function readLinuxMachineId() {
  const candidates = ['/etc/machine-id', '/var/lib/dbus/machine-id'];
  for (const p of candidates) {
    try {
      const v = fs.readFileSync(p, 'utf8').trim();
      if (v) {
        return v.toLowerCase();
      }
    } catch { /* try next */ }
  }
  return null;
}

function readWindowsMachineId() {
  try {
    const out = execSync(
      'reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
      { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }
    ).toString();
    const m = out.match(/MachineGuid\s+REG_SZ\s+([^\s]+)/i);
    return m ? m[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

function readMacOsMachineId() {
  try {
    const out = execSync(
      'ioreg -rd1 -c IOPlatformExpertDevice | awk \'/IOPlatformUUID/ { gsub(/"/,"",$3); print $3 }\'',
      { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }
    ).toString().trim();
    return out ? out.toLowerCase() : null;
  } catch {
    return null;
  }
}

function getMachineId() {
  switch (process.platform) {
  case 'linux': return readLinuxMachineId();
  case 'win32': return readWindowsMachineId();
  case 'darwin': return readMacOsMachineId();
  default: return null;
  }
}

/**
 * Compute the full fingerprint. Returns `{ fingerprint, macs, machineId }`.
 * Throws if MACs OR machine-id can't be determined — strict-bind mode by
 * design.
 */
function compute() {
  const host = readHostMachineFile();
  const macs = getPhysicalMacAddresses(host);
  if (macs.length === 0) {
    throw new Error(LICENSE_ERRORS.FP_NO_MACS);
  }
  const machineId = host ? host.machineId : getMachineId();
  if (!machineId) {
    throw new Error(LICENSE_ERRORS.FP_NO_MACHINE_ID);
  }
  const canonical = `macs=${macs.join(',')}|machine_id=${machineId}`;
  const fingerprint = crypto.createHash('sha256').update(canonical).digest('hex');
  return { fingerprint, macs, machineId };
}

/**
 * Verify that a previously-issued fingerprint still matches the current
 * hardware. We require BOTH:
 *   1. The expected fingerprint hash matches a fresh compute() (the
 *      common, cheap path).
 *   2. ALL the recorded MACs and the machine-id are still present
 *      (defends against an adversary who computed a collision against
 *      just the hash — which is impractical for SHA-256 anyway but
 *      cheap to verify directly).
 *
 * The second check requires `expectedDetails` (the original macs + id
 * captured at issue time). If we don't have it (older license token
 * without detail), we fall back to step 1 only.
 */
function verify(expectedFingerprint, expectedDetails = null) {
  let current;
  try {
    current = compute();
  } catch (err) {
    return { ok: false, reason: `compute_failed: ${err.message}` };
  }
  if (current.fingerprint !== expectedFingerprint) {
    return {
      ok: false,
      reason: 'fingerprint_mismatch',
      current: current.fingerprint,
      expected: expectedFingerprint
    };
  }
  if (expectedDetails && Array.isArray(expectedDetails.macs)) {
    const currentSet = new Set(current.macs);
    const missingMacs = expectedDetails.macs.filter(m => !currentSet.has(m));
    if (missingMacs.length > 0) {
      return { ok: false, reason: 'mac_missing', missingMacs };
    }
    if (expectedDetails.machineId && expectedDetails.machineId !== current.machineId) {
      return { ok: false, reason: 'machine_id_mismatch' };
    }
  }
  return { ok: true, current };
}

module.exports = {
  compute,
  verify
};

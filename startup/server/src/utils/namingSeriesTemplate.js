// A naming series template is literal text around one run of '#', e.g. "EMP-####".
// The run is where the counter goes, padded to the run's width — a number wider than
// the run grows past it rather than being cut ("EMP-####" at 12345 is "EMP-12345").

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Why a template can't be used, or '' when it can.
const templateProblem = (template) => {
  const text = String(template ?? '').trim();
  if (!text) {
    return 'Template is empty — write something like EMP-####.';
  }
  const runs = text.match(/#+/g) || [];
  if (runs.length !== 1) {
    return `Template "${text}" needs exactly one run of # for the number, found ${runs.length}.`;
  }
  // A code of digits only could be mistaken for a hand-typed serial number (and would be,
  // by anything that treats all-digit codes as a sequence), so a template needs some text.
  if (!/[^#0-9]/.test(text)) {
    return `Template "${text}" needs a letter or symbol besides the # (for example EMP-${text}), so its codes can't be mistaken for plain serial numbers.`;
  }
  return '';
};

const formatCode = (template, count) => {
  const [run] = template.match(/#+/);
  return template.replace(/#+/, String(count).padStart(run.length, '0'));
};

// The counter a code carries, or null when the code wasn't made from this template.
const countFromCode = (template, code) => {
  const [before, after] = template.split(/#+/);
  const pattern = new RegExp(`^${escapeRegex(before)}(\\d+)${escapeRegex(after)}$`);
  const match = String(code ?? '').trim().match(pattern);
  return match ? Number(match[1]) : null;
};

module.exports = { templateProblem, formatCode, countFromCode };

import { toWords } from 'number-to-words';

const titleCase = (str) =>
  str.replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());

const indianWords = (n) => {
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n / 100000) % 100);
  const thousand = Math.floor((n / 1000) % 100);
  const rest = n % 1000;
  const parts = [];
  if (crore) parts.push(`${toWords(crore)} crore`);
  if (lakh) parts.push(`${toWords(lakh)} lakh`);
  if (thousand) parts.push(`${toWords(thousand)} thousand`);
  if (rest) parts.push(toWords(rest));
  return titleCase(parts.join(' '));
};

const roundoffAmount = (amount) => {
  const n = Number(amount);
  return Number.isFinite(n) ? Math.round(n) : null;
};

const amountInWords = (amount, { suffix = 'Only' } = {}) => {
  const rounded = roundoffAmount(amount);
  if (rounded == null) return '';
  const sign = rounded < 0 ? 'Minus ' : '';
  const words = indianWords(Math.abs(rounded));
  return `${sign}${words} ${suffix}`.replace(/\s+/g, ' ').trim();
};

export { roundoffAmount, amountInWords };

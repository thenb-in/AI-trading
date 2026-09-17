/** The count with the word that fits it: plural(1, 'hour') -> "1 hour", plural(2, 'person', 'people') -> "2 people". */
const plural = (count, one, many) => `${count} ${Number(count) === 1 ? one : many || `${one}s`}`;

module.exports = { plural };

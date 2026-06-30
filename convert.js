const { formatHex, parse } = require('culori');

const accent = formatHex('oklch(0.2 0.04 45)');
const border = formatHex('oklch(0.85 0.15 45)');
const primary = formatHex('oklch(0.72 0.18 45)');

console.log('accent (bg):', accent);
console.log('border (stroke):', border);
console.log('primary (icon):', primary);

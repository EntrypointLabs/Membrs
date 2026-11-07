const shellQuote = (s) => `'${s.replace(/'/g, `'\\''`)}'`;

module.exports = {
  '*.{ts,tsx}': (files) => [
    `npx --no-install eslint --fix --max-warnings 0 ${files.map(shellQuote).join(' ')}`,
    `prettier --write ${files.map(shellQuote).join(' ')}`,
  ],
  '*.{css,json,md}': (files) =>
    `prettier --write ${files.map(shellQuote).join(' ')}`,
};

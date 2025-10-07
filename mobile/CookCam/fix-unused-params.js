#!/usr/bin/env node
/**
 * Auto-fix ESLint unused parameter errors by prefixing with underscore
 * Usage: node fix-unused-params.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get ESLint output
const eslintOutput = execSync(
  'npx eslint "src/**/*.{ts,tsx}" --format json',
  { encoding: 'utf-8', cwd: __dirname }
);

const results = JSON.parse(eslintOutput);

// Track changes
const changes = [];

results.forEach((result) => {
  const filePath = result.filePath;
  const unusedParams = result.messages.filter(
    (msg) =>
      msg.ruleId === 'no-unused-vars' &&
      msg.message.includes('is defined but never used')
  );

  if (unusedParams.length === 0) return;

  let fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');

  unusedParams.forEach((error) => {
    const lineIndex = error.line - 1;
    const line = lines[lineIndex];
    const varName = error.message.match(/'([^']+)'/)?.[1];

    if (!varName) return;

    // Only prefix function/arrow function parameters, not imports
    if (
      line.includes('=>') ||
      line.includes('function') ||
      line.includes('const ') ||
      line.includes('let ')
    ) {
      // Replace variable name with _prefixed version
      const regex = new RegExp(`\\b${varName}\\b(?!:)`, 'g');
      const newLine = line.replace(regex, (match, offset) => {
        // Don't replace if it's already prefixed
        if (line[offset - 1] === '_') return match;
        // Don't replace in comments
        if (line.slice(0, offset).includes('//')) return match;
        return `_${match}`;
      });

      if (newLine !== line) {
        lines[lineIndex] = newLine;
        changes.push({
          file: path.relative(process.cwd(), filePath),
          line: error.line,
          variable: varName,
        });
      }
    }
  });

  fs.writeFileSync(filePath, lines.join('\n'));
});

console.log(`✅ Fixed ${changes.length} unused parameter(s)`);
if (changes.length > 0) {
  console.log('\nChanges made:');
  changes.slice(0, 10).forEach((change) => {
    console.log(`  - ${change.file}:${change.line} → _${change.variable}`);
  });
  if (changes.length > 10) {
    console.log(`  ... and ${changes.length - 10} more`);
  }
}


#!/usr/bin/env node
/**
 * Auto-fix all ESLint unused variable/import errors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get ESLint output
console.log('🔍 Analyzing code...');
let eslintOutput;
try {
  eslintOutput = execSync(
    'npx eslint "src/**/*.{ts,tsx}" --format json --quiet',
    { encoding: 'utf-8', cwd: __dirname }
  );
} catch (error) {
  // ESLint exits with code 1 when there are errors, but still outputs JSON
  eslintOutput = error.stdout;
}

const results = JSON.parse(eslintOutput);

// Track changes
let changesCount = 0;

results.forEach((result) => {
  const filePath = result.filePath;
  const messages = result.messages.filter(
    (msg) => msg.ruleId === 'no-unused-vars' || msg.ruleId === '@typescript-eslint/no-unused-vars'
  );

  if (messages.length === 0) return;

  let fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');

  // Group messages by type
  const unusedImports = [];
  const unusedParams = [];
  const unusedVars = [];

  messages.forEach((msg) => {
    const varName = msg.message.match(/'([^']+)'/)?.[1];
    if (!varName) return;

    const lineIndex = msg.line - 1;
    const line = lines[lineIndex];

    if (line.includes('import')) {
      unusedImports.push({ line: msg.line, varName, lineIndex });
    } else if (msg.message.includes('is defined but never used')) {
      unusedParams.push({ line: msg.line, varName, lineIndex });
    } else if (msg.message.includes('is assigned a value but never used')) {
      unusedVars.push({ line: msg.line, varName, lineIndex });
    }
  });

  // Fix unused imports by removing them
  unusedImports.forEach(({ lineIndex, varName }) => {
    const line = lines[lineIndex];
    
    // Check if it's a single import on a line
    if (line.match(new RegExp(`^import\\s+${varName}\\s+from`))) {
      lines[lineIndex] = ''; // Remove entire line
      changesCount++;
    }
    // Check if it's part of a destructured import
    else if (line.includes('{') && line.includes('}')) {
      const regex = new RegExp(`\\s*${varName}\\s*,?\\s*`);
      const newLine = line.replace(regex, (match) => {
        changesCount++;
        // If there's a comma, keep one comma for proper syntax
        return match.includes(',') ? '' : '';
      });
      lines[lineIndex] = newLine;
      
      // Clean up empty imports {}
      if (newLine.match(/{\s*}/)) {
        lines[lineIndex] = '';
      }
    }
  });

  // Fix unused parameters by prefixing with _
  unusedParams.forEach(({ lineIndex, varName }) => {
    const line = lines[lineIndex];
    
    // Only prefix if not already prefixed
    if (!varName.startsWith('_')) {
      // Match the variable as a parameter (after : or =>, before : or , or ))
      const regex = new RegExp(`([(,\\s])${varName}(?=[,:\\s)])`, 'g');
      lines[lineIndex] = line.replace(regex, `$1_${varName}`);
      changesCount++;
    }
  });

  // Fix unused variables by prefixing with _
  unusedVars.forEach(({ lineIndex, varName }) => {
    const line = lines[lineIndex];
    
    // Only prefix if not already prefixed
    if (!varName.startsWith('_')) {
      // Match destructured variables
      if (line.includes('const') || line.includes('let')) {
        const regex = new RegExp(`\\b${varName}\\b(?!:)`, 'g');
        lines[lineIndex] = line.replace(regex, (match, offset) => {
          // Don't replace if already has underscore before it
          if (line[offset - 1] === '_') return match;
          changesCount++;
          return `_${match}`;
        });
      }
    }
  });

  // Write back to file
  const newContent = lines.join('\n')
    .replace(/\n\n\n+/g, '\n\n') // Remove excessive blank lines
    .replace(/{\s*,/g, '{') // Fix { , remaining comma
    .replace(/,\s*}/g, '}') // Fix , } remaining comma
    .replace(/\(\s*,/g, '(') // Fix ( , in params
    .replace(/,\s*\)/g, ')'); // Fix , ) in params
    
  fs.writeFileSync(filePath, newContent);
});

console.log(`✅ Fixed ${changesCount} unused variables/imports`);


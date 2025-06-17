#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Script to systematically replace console statements with logger calls
class ConsoleReplacer {
  constructor() {
    this.replacements = [
      // Debug/info logs
      {
        pattern: /console\.log\(/g,
        replacement: 'logger.debug(',
        description: 'Replace console.log with logger.debug'
      },
      // Error logs
      {
        pattern: /console\.error\(/g,
        replacement: 'logger.error(',
        description: 'Replace console.error with logger.error'
      },
      // Warning logs
      {
        pattern: /console\.warn\(/g,
        replacement: 'logger.warn(',
        description: 'Replace console.warn with logger.warn'
      }
    ];
  }

  async replaceInFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      let importAdded = false;

      // Apply replacements
      for (const replacement of this.replacements) {
        if (replacement.pattern.test(content)) {
          content = content.replace(replacement.pattern, replacement.replacement);
          modified = true;
        }
      }

      // Add logger import if console statements were replaced
      if (modified && !content.includes('import logger') && !content.includes('from "../utils/logger"')) {
        // Determine the correct relative path to logger
        const relativePath = this.getLoggerImportPath(filePath);
        const importStatement = `import logger from "${relativePath}";\n`;
        
        // Add import after existing imports
        const lines = content.split('\n');
        let lastImportIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('import ') || lines[i].startsWith('const ') && lines[i].includes('require(')) {
            lastImportIndex = i;
          }
        }
        
        if (lastImportIndex >= 0) {
          lines.splice(lastImportIndex + 1, 0, importStatement);
          content = lines.join('\n');
          importAdded = true;
        }
      }

      // Write back if modified
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated: ${filePath}${importAdded ? ' (added logger import)' : ''}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
      return false;
    }
  }

  getLoggerImportPath(filePath) {
    // Calculate relative path from current file to logger
    const fileDir = path.dirname(filePath);
    const loggerPath = path.resolve('./src/utils/logger');
    const relativePath = path.relative(fileDir, loggerPath);
    
    // Ensure it starts with ./ or ../
    if (!relativePath.startsWith('.')) {
      return `./${relativePath}`;
    }
    
    return relativePath;
  }

  async replaceInDirectory(pattern = 'src/**/*.{ts,tsx}') {
    console.log('🔄 Starting console statement replacement...');
    
    const files = glob.sync(pattern, { ignore: ['node_modules/**', 'dist/**'] });
    let modifiedFiles = 0;
    
    for (const file of files) {
      const wasModified = await this.replaceInFile(file);
      if (wasModified) {
        modifiedFiles++;
      }
    }
    
    console.log(`\n📊 Replacement Summary:`);
    console.log(`   Files processed: ${files.length}`);
    console.log(`   Files modified: ${modifiedFiles}`);
    console.log(`   Files unchanged: ${files.length - modifiedFiles}`);
  }
}

// Run the replacement
if (require.main === module) {
  const replacer = new ConsoleReplacer();
  replacer.replaceInDirectory()
    .then(() => {
      console.log('\n✅ Console replacement completed!');
      console.log('💡 Run npm run fix-lint to see the results.');
    })
    .catch(error => {
      console.error('❌ Replacement failed:', error);
      process.exit(1);
    });
}

module.exports = ConsoleReplacer; 
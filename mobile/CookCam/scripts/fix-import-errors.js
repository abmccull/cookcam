#!/usr/bin/env node

const fs = require('fs');
const glob = require('glob');

// Script to fix malformed import statements
class ImportFixer {
  fixFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Pattern: import { ... import logger from "../utils/logger"; ... } from "...";
      // This pattern occurs when our script inserts logger import in the middle of another import
      const malformedPattern = /(import\s+[^}]*\{\s*)(import\s+logger[^;]+;\s*)([\s\S]*?\}\s*from\s+["'][^"']+["'];)/gm;
      
      if (malformedPattern.test(content)) {
        console.log(`🔧 Fixing malformed imports in: ${filePath}`);
        
        content = content.replace(malformedPattern, (match, before, loggerImport, after) => {
          // Remove the logger import from the middle
          const fixedImport = before + after;
          // Add logger import at the end
          return fixedImport + '\n' + loggerImport.trim();
        });
        
        fs.writeFileSync(filePath, content, 'utf8');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Error fixing ${filePath}:`, error.message);
      return false;
    }
  }
  
  async fixAllFiles() {
    console.log('🔄 Starting import statement fixes...');
    
    const files = glob.sync('src/**/*.{ts,tsx}', { ignore: ['node_modules/**', 'dist/**'] });
    let fixedFiles = 0;
    
    for (const file of files) {
      const wasFixed = this.fixFile(file);
      if (wasFixed) {
        fixedFiles++;
      }
    }
    
    console.log(`\n📊 Fix Summary:`);
    console.log(`   Files processed: ${files.length}`);
    console.log(`   Files fixed: ${fixedFiles}`);
    console.log(`   Files unchanged: ${files.length - fixedFiles}`);
  }
}

// Run the fixer
if (require.main === module) {
  const fixer = new ImportFixer();
  fixer.fixAllFiles()
    .then(() => {
      console.log('\n✅ Import fixing completed!');
    })
    .catch(error => {
      console.error('❌ Import fixing failed:', error);
      process.exit(1);
    });
}

module.exports = ImportFixer; 
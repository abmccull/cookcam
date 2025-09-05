// Simple test to check if we can import the component

console.log('Starting import test...');

try {
  // Try to read the component file directly
  const fs = require('fs');
  const path = require('path');
  
  const componentPath = path.join(__dirname, 'src', 'components', 'XPProgressBar.tsx');
  const content = fs.readFileSync(componentPath, 'utf8');
  
  console.log('Component file exists and is readable');
  console.log('File size:', content.length, 'characters');
  
  // Check for export
  if (content.includes('export default')) {
    console.log('✓ Has default export');
  } else {
    console.log('✗ Missing default export');
  }
  
  // Check for import issues
  if (content.includes('import')) {
    console.log('✓ Has imports');
  }
  
} catch (error) {
  console.error('Error:', error.message);
}
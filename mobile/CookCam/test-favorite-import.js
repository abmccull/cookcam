// Test FavoriteButton import
const path = require('path');
const fs = require('fs');

// Check if the file exists
const componentPath = path.join(__dirname, 'src', 'components', 'FavoriteButton.tsx');
console.log('Component path:', componentPath);
console.log('File exists:', fs.existsSync(componentPath));

// Read the file
const content = fs.readFileSync(componentPath, 'utf8');

// Check for export
if (content.includes('export default FavoriteButton')) {
  console.log('✓ Has default export');
} else {
  console.log('✗ Missing default export');
}

// Check for problematic imports
const problematicImports = [
  'lottie-react-native',
  'lucide-react-native',
];

problematicImports.forEach(imp => {
  if (content.includes(imp)) {
    console.log(`Found import: ${imp}`);
  }
});
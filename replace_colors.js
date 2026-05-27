import fs from 'fs';
import path from 'path';

const filePath = './src/App.jsx';

try {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace non-standard slate-850 with standard slate-800
  const originalSlate850Count = (content.match(/slate-850/g) || []).length;
  content = content.replace(/slate-850/g, 'slate-800');

  // Replace non-standard slate-450 with standard slate-400
  const originalSlate450Count = (content.match(/slate-450/g) || []).length;
  content = content.replace(/slate-450/g, 'slate-400');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully replaced colors in App.jsx:`);
  console.log(`- Changed ${originalSlate850Count} instances of slate-850 to slate-800`);
  console.log(`- Changed ${originalSlate450Count} instances of slate-450 to slate-400`);
} catch (err) {
  console.error('Error processing App.jsx:', err.message);
  process.exit(1);
}

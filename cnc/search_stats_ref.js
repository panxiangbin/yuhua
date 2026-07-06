const fs = require('fs');
fs.readdirSync('.').forEach(file => {
  if (file.endsWith('.js') || file.endsWith('.py') || file.endsWith('.html')) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('gallery-statistics')) {
      console.log(`Found in: ${file}`);
    }
  }
});

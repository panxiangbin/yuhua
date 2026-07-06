const fs = require('fs');
fs.readdirSync('.').forEach(file => {
  if (file.endsWith('.js')) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('G代码相关') || content.includes('坐标系相关')) {
      console.log(`Found in: ${file}`);
    }
  }
});

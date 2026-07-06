const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const regex = /<script\s+src="([^"]+)"/g;
let match;
while ((match = regex.exec(html)) !== null) {
  console.log(match[1]);
}

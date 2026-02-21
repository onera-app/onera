const fs = require('fs');
const svg = fs.readFileSync('./onera-logo.svg', 'utf8');
const match = svg.match(/xlink:href="data:image\/png;base64,([^"]+)"/);
if (match) {
  const base64Data = match[1];
  fs.writeFileSync('./onera-logo.png', Buffer.from(base64Data, 'base64'));
  console.log('Extracted onera-logo.png successfully!');
} else {
  console.log('No base64 png found');
}

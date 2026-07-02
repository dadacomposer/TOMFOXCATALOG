const fs = require('fs');
const buffer = fs.readFileSync('public/images/voxlogo.jpg');
console.log("Size:", buffer.length);

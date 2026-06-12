const fs = require('fs');
const p = 'd:\\3、系统项目开发\\trae_projects\\SMYweb3.020260527\\apps\\api\\src\\modules\\evidence\\evidence.service.ts';
let c = fs.readFileSync(p, 'utf8');

// Fix 1: ipfsCid -> metadata
c = c.replace(
  '        ipfsCid,\n        txHash',
  "        metadata: JSON.stringify({ ipfsCid }),\n        txHash"
);

// Fix 2: status -> isVerified
c = c.replace("status: 'confirmed',", 'isVerified: true,');

// Fix 3: MinIO prototype
c = c.replace('.default.prototype.getObject.call', '.default.getObject.call');

fs.writeFileSync(p, c, 'utf8');
console.log('ALL evidence fixes applied');

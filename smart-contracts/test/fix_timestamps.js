const fs = require('fs');
const files = ['payment.test.js', 'refund.test.js', 'buyback.test.js', 'forfeiture.test.js'];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Fix the evm_mine calls that don't have proper hex
  content = content.replace(/await ethers\.provider\.send\("evm_mine", \[["']0x64["']\]\);/g,
    'await ethers.provider.send("evm_mine", []);');
  
  // Fix setNextBlockTimestamp to use proper timestamp calculation
  content = content.replace(/await ethers\.provider\.send\("evm_setNextBlockTimestamp", \[(\d+)\]\);/g,
    (match, num) => `const futureTime = Math.floor(Date.now() / 1000) + ${num};
      await ethers.provider.send("evm_setNextBlockTimestamp", [futureTime]);`);
  
  fs.writeFileSync(file, content);
});

console.log('Fixed timestamps in all test files');

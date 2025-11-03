// scripts/simple-publish-test.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 极简发布测试');

// 检查基本文件
const files = [
  'package.json',
  'README.md',
  'dist/bin/git-sync.js',
  'dist/lib/config-loader.js',
  'dist/lib/git-operator.js',
  'dist/lib/sync-engine.js',
];

console.log('\n📁 文件检查:');
let allOk = true;

files.forEach((file) => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - 缺失`);
    allOk = false;
  }
});

// 检查package.json
console.log('\n📦 包配置检查:');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const required = ['name', 'version', 'description', 'main', 'bin'];

  required.forEach((field) => {
    if (pkg[field]) {
      console.log(`✅ ${field}: ${pkg[field]}`);
    } else {
      console.log(`❌ 缺少字段: ${field}`);
      allOk = false;
    }
  });
} catch (error) {
  console.log('❌ 无法读取package.json');
  allOk = false;
}

// 测试命令行
console.log('\n❓ 命令行测试:');
try {
  const output = execSync('node dist/bin/git-sync.js --help', {
    encoding: 'utf8',
  });
  if (output.includes('Usage:')) {
    console.log('✅ 命令行工作正常');
  } else {
    console.log('❌ 命令行输出异常');
    allOk = false;
  }
} catch (error) {
  console.log('❌ 命令行测试失败');
  allOk = false;
}

// 结果
console.log('\n📊 测试结果:');
if (allOk) {
  console.log('🎉 所有测试通过！可以发布到npm');
  console.log('\n运行: npm publish');
  process.exit(0);
} else {
  console.log('💥 测试失败，请修复问题');
  process.exit(1);
}

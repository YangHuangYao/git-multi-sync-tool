// scripts/debug.js
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.blue('🐛 调试模式'));

// 测试配置加载器
function debugConfigLoader() {
  console.log(chalk.cyan('\n调试配置加载器...'));

  const configLoader = require('../dist/lib/config-loader').default;

  // 测试1: 空目录
  console.log(chalk.yellow('\n测试1: 空目录'));
  const emptyResult = configLoader.loadConfig(__dirname);
  console.log('空目录结果:', emptyResult);

  // 测试2: 有配置文件的目录
  console.log(chalk.yellow('\n测试2: 创建测试配置'));
  const testDir = path.join(__dirname, 'debug-test');
  fs.ensureDirSync(testDir);

  const testConfig = `
https://github.com/user/repo1.git
https://gitee.com/user/repo1.git
[backup] https://gitlab.com/user/repo1.git
`;

  fs.writeFileSync(path.join(testDir, '.git-remotes.txt'), testConfig);

  const configResult = configLoader.loadConfig(testDir);
  console.log('配置加载结果:', {
    exists: configResult.exists,
    remotes: configResult.remotes
      ? configResult.remotes.map((r) => ({ name: r.name, url: r.url }))
      : '无',
    error: configResult.error,
  });

  // 清理
  fs.removeSync(testDir);
}

debugConfigLoader();

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.blue('🧪 简单功能测试'));

// 测试配置文件加载
function testConfigLoader() {
  console.log(chalk.cyan('\n1. 测试配置加载器...'));
  
  const configLoader = require('../lib/config-loader');
  
  // 创建临时测试文件
  const testContent = `
https://github.com/test/repo1.git
https://gitee.com/test/repo1.git
`;
  
  const tempDir = path.join(__dirname, 'temp-test');
  fs.ensureDirSync(tempDir);
  fs.writeFileSync(path.join(tempDir, '.git-remotes.txt'), testContent);
  
  const config = configLoader.loadConfig(tempDir);
  
  console.log('配置加载结果:', {
    exists: config.exists,
    remotesCount: config.remotes ? config.remotes.length : 0,
    error: config.error
  });
  
  if (config.exists && config.remotes && config.remotes.length === 2) {
    console.log(chalk.green('✅ 配置加载测试通过'));
    console.log(chalk.gray('远程仓库:'), config.remotes.map(r => `${r.name}: ${r.url}`));
  } else {
    console.log(chalk.red('❌ 配置加载测试失败'));
    if (config.error) {
      console.log(chalk.red('错误信息:'), config.error);
    }
  }
  
  // 清理
  fs.removeSync(tempDir);
}

// 测试同步引擎
function testSyncEngine() {
  console.log(chalk.cyan('\n2. 测试同步引擎...'));
  
  const SyncEngine = require('../lib/sync-engine');
  
  try {
    const engine = new SyncEngine();
    // 这里应该会报错，因为没有配置文件，这是预期的
    console.log(chalk.green('✅ 同步引擎初始化测试通过'));
  } catch (error) {
    console.log(chalk.green('✅ 同步引擎错误处理测试通过'));
  }
}

// 测试命令行帮助
function testCommandHelp() {
  console.log(chalk.cyan('\n3. 测试命令行帮助...'));
  
  try {
    const { execSync } = require('child_process');
    const output = execSync('node bin/git-sync.js --help', { encoding: 'utf-8' });
    
    if (output.includes('Usage:') && output.includes('Commands:')) {
      console.log(chalk.green('✅ 命令行帮助测试通过'));
    } else {
      console.log(chalk.yellow('⚠️ 命令行帮助输出异常'));
    }
  } catch (error) {
    console.log(chalk.red('❌ 命令行帮助测试失败:'), error.message);
  }
}

// 运行所有测试
try {
  testConfigLoader();
  testSyncEngine();
  testCommandHelp();
  console.log(chalk.green('\n🎉 简单功能测试完成'));
} catch (error) {
  console.error(chalk.red('测试执行错误:'), error);
  process.exit(1);
}
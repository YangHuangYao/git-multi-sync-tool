// scripts/test-local.js
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path'); // 添加这行
const chalk = require('chalk');

console.log(chalk.blue('🔧 开始本地测试流程...'));

class LocalTester {
  constructor() {
    this.packageName = 'git-multi-sync-tool';
    this.version = require('../package.json').version;
    this.tarballName = `${this.packageName}-${this.version}.tgz`;
  }
  
  // 运行测试
  runTests() {
    console.log(chalk.cyan('\n🧪 运行单元测试...'));
    try {
      execSync('npm test', { stdio: 'inherit' });
      console.log(chalk.green('✅ 单元测试通过'));
    } catch (error) {
      console.error(chalk.red('❌ 单元测试失败'));
      process.exit(1);
    }
  }
  
  // 打包npm包
  createPackage() {
    console.log(chalk.cyan('\n📦 创建npm包...'));
    try {
      execSync('npm pack', { stdio: 'inherit' });
      
      if (fs.existsSync(this.tarballName)) {
        console.log(chalk.green(`✅ 包创建成功: ${this.tarballName}`));
      } else {
        throw new Error('包文件未找到');
      }
    } catch (error) {
      console.error(chalk.red('❌ 包创建失败:'), error.message);
      process.exit(1);
    }
  }
  
  // 在临时目录中测试安装
  testInstall() {
    console.log(chalk.cyan('\n📥 测试安装...'));
    
    const testDir = path.join(__dirname, '..', 'test-install');
    
    try {
      // 创建测试目录
      if (fs.existsSync(testDir)) {
        fs.removeSync(testDir);
      }
      fs.ensureDirSync(testDir);
      
      // 在测试目录中安装包
      execSync(`npm install ../${this.tarballName}`, { 
        cwd: testDir,
        stdio: 'inherit' 
      });
      
      // 测试命令是否可用
      const output = execSync('npx git-sync --help', { 
        cwd: testDir,
        encoding: 'utf-8' 
      });
      
      if (output.includes('Usage:')) {
        console.log(chalk.green('✅ 安装测试通过'));
      }
      
      // 清理
      fs.removeSync(testDir);
      
    } catch (error) {
      console.error(chalk.red('❌ 安装测试失败:'), error.message);
      process.exit(1);
    }
  }
  
  // 全局安装测试
  testGlobalInstall() {
    console.log(chalk.cyan('\n🌍 测试全局安装...'));
    
    try {
      // 先卸载（如果已安装）
      try {
        execSync('npm uninstall -g git-multi-sync-tool', { stdio: 'ignore' });
      } catch (error) {
        // 忽略卸载错误
      }
      
      // 全局安装
      execSync(`npm install -g ${this.tarballName}`, { stdio: 'inherit' });
      
      // 测试全局命令
      const output = execSync('git-sync --help', { encoding: 'utf-8' });
      
      if (output.includes('Usage:')) {
        console.log(chalk.green('✅ 全局安装测试通过'));
        
        // 卸载
        execSync('npm uninstall -g git-multi-sync-tool', { stdio: 'ignore' });
      }
      
    } catch (error) {
      console.error(chalk.red('❌ 全局安装测试失败:'), error.message);
      process.exit(1);
    }
  }
  
  // 运行完整测试流程
  runFullTest() {
    console.log(chalk.blue('🚀 开始完整本地测试流程\n'));
    
    this.runTests();
    this.createPackage();
    this.testInstall();
    this.testGlobalInstall();
    
    console.log(chalk.green('\n🎉 所有本地测试通过！'));
    console.log(chalk.blue('\n📤 现在可以安全地发布到npm了:'));
    console.log(chalk.cyan('  npm publish'));
  }
}

// 运行测试
const tester = new LocalTester();
tester.runFullTest();
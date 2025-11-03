// test/integration-test.js
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.blue('🔧 开始集成测试...'));

class IntegrationTest {
  constructor() {
    this.testDir = path.join(__dirname, 'integration-test-temp');
    this.projectRoot = path.join(__dirname, '..'); // 项目根目录
    this.setupTestEnvironment();
  }

  setupTestEnvironment() {
    // 清理并创建测试目录
    if (fs.existsSync(this.testDir)) {
      fs.removeSync(this.testDir);
    }
    fs.ensureDirSync(this.testDir);

    console.log(chalk.green('✅ 测试环境设置完成'));
  }

  // 获取正确的命令路径
  getCommandPath() {
    return path.join(this.projectRoot, 'dist', 'bin', 'git-sync.js');
  }

  // 测试配置文件创建
  testConfigCreation() {
    console.log(chalk.cyan('\n📝 测试配置文件创建...'));

    try {
      const commandPath = this.getCommandPath();

      // 在测试目录中执行 git-sync init
      execSync(`node "${commandPath}" init`, {
        cwd: this.testDir,
        stdio: 'pipe',
      });

      // 检查配置文件是否创建
      const configPath = path.join(this.testDir, '.git-remotes.txt');
      if (fs.existsSync(configPath)) {
        console.log(chalk.green('✅ 配置文件创建测试通过'));
        return true;
      } else {
        throw new Error('配置文件未创建');
      }
    } catch (error) {
      console.error(chalk.red('❌ 配置文件创建测试失败:'), error.message);
      return false;
    }
  }

  // 测试配置解析
  testConfigParsing() {
    console.log(chalk.cyan('\n🔍 测试配置解析...'));

    try {
      // 创建测试配置
      const configContent = `
# 集成测试配置
https://github.com/testuser/test-repo.git
https://gitee.com/testuser/test-repo.git
`;

      fs.writeFileSync(
        path.join(this.testDir, '.git-remotes.txt'),
        configContent,
      );

      // 测试配置加载 - 使用正确的相对路径
      const configLoader = require('../dist/lib/config-loader').default;
      const config = configLoader.loadConfig(this.testDir);

      if (config.exists && config.remotes.length === 2) {
        console.log(chalk.green('✅ 配置解析测试通过'));
        return true;
      } else {
        throw new Error('配置解析失败');
      }
    } catch (error) {
      console.error(chalk.red('❌ 配置解析测试失败:'), error.message);
      return false;
    }
  }

  // 测试命令帮助
  testCommandHelp() {
    console.log(chalk.cyan('\n❓ 测试命令帮助...'));

    try {
      const commandPath = this.getCommandPath();
      const output = execSync(`node "${commandPath}" --help`, {
        encoding: 'utf-8',
      });

      if (output.includes('Usage:') && output.includes('Commands:')) {
        console.log(chalk.green('✅ 命令帮助测试通过'));
        return true;
      } else {
        throw new Error('帮助命令输出异常');
      }
    } catch (error) {
      console.error(chalk.red('❌ 命令帮助测试失败:'), error.message);
      return false;
    }
  }

  // 运行所有测试
  runAllTests() {
    console.log(chalk.blue('\n🚀 开始运行集成测试套件'));

    const tests = [
      this.testConfigCreation.bind(this),
      this.testConfigParsing.bind(this),
      this.testCommandHelp.bind(this),
    ];

    let passed = 0;
    let failed = 0;

    tests.forEach((test, index) => {
      try {
        if (test()) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(chalk.red(`测试 ${index + 1} 执行错误:`), error);
        failed++;
      }
    });

    console.log(chalk.blue('\n📊 测试结果:'));
    console.log(chalk.green(`✅ 通过: ${passed}`));
    console.log(chalk.red(`❌ 失败: ${failed}`));
    console.log(chalk.blue(`📈 总计: ${passed + failed}`));

    // 清理测试环境
    this.cleanup();

    return failed === 0;
  }

  cleanup() {
    if (fs.existsSync(this.testDir)) {
      fs.removeSync(this.testDir);
    }
  }
}

// 运行测试
const test = new IntegrationTest();
const success = test.runAllTests();

if (success) {
  console.log(chalk.green('\n🎉 所有集成测试通过！'));
  process.exit(0);
} else {
  console.log(chalk.red('\n💥 部分测试失败，请检查问题后再发布'));
  process.exit(1);
}

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.blue('🚀 发布前测试流程'));

class PublishTester {
  constructor() {
    this.projectRoot = process.cwd();
  }

  // 基本文件检查
  checkFiles() {
    console.log(chalk.cyan('\n📁 检查必要文件...'));

    const requiredFiles = [
      'package.json',
      'README.md',
      'LICENSE',
      'dist/bin/git-sync.js',
      'dist/lib/config-loader.js',
      'dist/lib/git-operator.js',
      'dist/lib/sync-engine.js',
    ];

    let allExists = true;

    requiredFiles.forEach((file) => {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        console.log(chalk.green(`✅ ${file}`));
      } else {
        console.log(chalk.red(`❌ ${file} - 文件不存在`));
        allExists = false;
      }
    });

    return allExists;
  }

  // 测试包JSON配置
  checkPackageJson() {
    console.log(chalk.cyan('\n📦 检查package.json配置...'));

    try {
      const pkg = require(path.join(this.projectRoot, 'package.json'));

      const checks = [
        { field: 'name', required: true },
        { field: 'version', required: true },
        { field: 'description', required: true },
        { field: 'main', required: true },
        { field: 'bin', required: true },
        { field: 'keywords', required: false },
      ];

      let allValid = true;

      checks.forEach((check) => {
        if (check.required && !pkg[check.field]) {
          console.log(chalk.red(`❌ 缺少必需字段: ${check.field}`));
          allValid = false;
        } else if (pkg[check.field]) {
          console.log(
            chalk.green(
              `✅ ${check.field}: ${JSON.stringify(pkg[check.field])}`,
            ),
          );
        }
      });

      return allValid;
    } catch (error) {
      console.log(chalk.red('❌ 读取package.json失败:'), error.message);
      return false;
    }
  }

  // 测试命令行帮助
  testCliHelp() {
    console.log(chalk.cyan('\n❓ 测试命令行帮助...'));

    try {
      const output = execSync('node dist/bin/git-sync.js --help', {
        encoding: 'utf-8',
        cwd: this.projectRoot,
      });

      if (output.includes('Usage:') && output.includes('Commands:')) {
        console.log(chalk.green('✅ 命令行帮助测试通过'));
        return true;
      } else {
        console.log(chalk.red('❌ 命令行帮助输出异常'));
        return false;
      }
    } catch (error) {
      console.log(chalk.red('❌ 命令行帮助测试失败:'), error.message);
      return false;
    }
  }

  // 运行所有测试
  runAllTests() {
    console.log(chalk.blue('\n🧪 开始发布前测试套件\n'));

    const tests = [
      { name: '文件检查', test: this.checkFiles.bind(this) },
      { name: '包配置检查', test: this.checkPackageJson.bind(this) },
      { name: '命令行帮助', test: this.testCliHelp.bind(this) },
    ];

    let passed = 0;
    let failed = 0;

    tests.forEach((testCase, index) => {
      console.log(chalk.yellow(`\n${index + 1}. ${testCase.name}`));
      try {
        if (testCase.test()) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        console.log(chalk.red(`测试执行错误: ${error.message}`));
        failed++;
      }
    });

    console.log(chalk.blue('\n📊 测试结果:'));
    console.log(chalk.green(`✅ 通过: ${passed}`));
    console.log(chalk.red(`❌ 失败: ${failed}`));

    if (failed === 0) {
      console.log(chalk.green('\n🎉 所有测试通过！可以安全发布到npm'));
      console.log(chalk.blue('\n发布命令:'));
      console.log(chalk.cyan('  npm publish'));
      return true;
    } else {
      console.log(chalk.red('\n💥 有测试失败，请修复问题后再发布'));
      return false;
    }
  }
}

// 运行测试
const tester = new PublishTester();
const success = tester.runAllTests();

process.exit(success ? 0 : 1);

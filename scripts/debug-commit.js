const { execSync } = require('child_process');
const chalk = require('chalk');

console.log(chalk.blue('🔍 调试提交命令问题...'));

class CommitDebugger {
  constructor() {
    this.projectPath = process.cwd();
  }
  
  // 测试原生git命令
  testNativeGit() {
    console.log(chalk.cyan('\n1. 测试原生Git命令...'));
    
    try {
      console.log(chalk.gray('测试: git add .'));
      execSync('git add .', { stdio: 'inherit' });
      console.log(chalk.green('✅ git add . 正常'));
      
      console.log(chalk.gray('测试: git commit -m "test"'));
      execSync('git commit -m "调试测试"', { stdio: 'inherit' });
      console.log(chalk.green('✅ git commit 正常'));
      
      return true;
    } catch (error) {
      console.log(chalk.red('❌ 原生Git命令失败:'), error.message);
      return false;
    }
  }
  
  // 测试git-operator
  testGitOperator() {
    console.log(chalk.cyan('\n2. 测试GitOperator...'));
    
    try {
      const GitOperator = require('../dist/lib/git-operator').default;
      const git = new GitOperator();
      
      console.log(chalk.gray('测试: git.add()'));
      const addResult = git.add();
      console.log('add结果:', {
        success: addResult.success,
        command: addResult.command,
        error: addResult.error
      });
      
      if (addResult.success) {
        console.log(chalk.green('✅ git.add() 正常'));
        return true;
      } else {
        console.log(chalk.red('❌ git.add() 失败'));
        return false;
      }
    } catch (error) {
      console.log(chalk.red('❌ GitOperator测试失败:'), error.message);
      return false;
    }
  }
  
  // 测试完整提交流程
  testFullCommit() {
    console.log(chalk.cyan('\n3. 测试完整提交流程...'));
    
    try {
      const SyncEngine = require('../dist/lib/sync-engine').default;
      const engine = new SyncEngine();
      
      // 创建测试文件
      execSync('echo "test" > debug-test.txt', { stdio: 'pipe' });
      
      console.log(chalk.gray('测试: syncCommit'));
      engine.syncCommit('调试测试提交');
      
      // 清理测试文件
      execSync('git reset HEAD~1', { stdio: 'pipe' });
      execSync('rm debug-test.txt', { stdio: 'pipe' });
      
      return true;
    } catch (error) {
      console.log(chalk.red('❌ 完整提交测试失败:'), error.message);
      return false;
    }
  }
  
  // 运行所有测试
  runAllTests() {
    console.log(chalk.blue('🚀 开始提交命令调试诊断\n'));
    
    const tests = [
      this.testNativeGit.bind(this),
      this.testGitOperator.bind(this),
      this.testFullCommit.bind(this)
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
        console.log(chalk.red(`测试 ${index + 1} 执行错误: ${error.message}`));
        failed++;
      }
    });
    
    console.log(chalk.blue('\n📊 调试结果:'));
    console.log(chalk.green(`✅ 通过: ${passed}`));
    console.log(chalk.red(`❌ 失败: ${failed}`));
    
    return failed === 0;
  }
}

// 运行调试
const debugger = new CommitDebugger();
const success = debugger.runAllTests();

if (success) {
  console.log(chalk.green('\n🎉 调试完成，问题已定位'));
} else {
  console.log(chalk.red('\n💥 发现问题，需要进一步修复'));
}

process.exit(success ? 0 : 1);
// lib/simple-sync.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class SimpleSync {
  constructor() {
    this.projectPath = process.cwd();
  }

  // 简单提交方法
  simpleCommit(message, options = {}) {
    console.log(chalk.blue('🔄 提交代码...'));
    
    try {
      // 添加文件
      execSync('git add .', { stdio: 'inherit' });
      
      // 提交
      execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
      
      console.log(chalk.green('✅ 提交完成'));
      
      // 如果设置了推送选项，自动推送
      if (options.push) {
        this.simplePush();
      }
    } catch (error) {
      console.error(chalk.red('提交失败:'), error.message);
    }
  }

  // 简单推送方法
  simplePush() {
    console.log(chalk.blue('📤 推送到所有远程仓库...'));
    
    try {
      // 获取所有远程仓库
      const remotesOutput = execSync('git remote', { encoding: 'utf8' });
      const remotes = remotesOutput.split('\n').filter(name => name.trim());
      
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      
      remotes.forEach(remote => {
        try {
          console.log(chalk.cyan(`推送到 ${remote}...`));
          execSync(`git push ${remote} ${currentBranch}`, { stdio: 'inherit' });
          console.log(chalk.green(`✅ ${remote} 推送成功`));
        } catch (error) {
          console.error(chalk.red(`❌ ${remote} 推送失败:`), error.message);
        }
      });
      
      console.log(chalk.green('🎉 推送完成'));
    } catch (error) {
      console.error(chalk.red('推送失败:'), error.message);
    }
  }

  // 显示配置
  showConfig() {
    console.log(chalk.blue('📊 当前Git配置:'));
    
    try {
      // 显示远程仓库
      const remotes = execSync('git remote -v', { encoding: 'utf8' });
      console.log(chalk.cyan('远程仓库:'));
      console.log(remotes);
      
      // 显示当前分支
      const branch = execSync('git branch --show-current', { encoding: 'utf8' });
      console.log(chalk.cyan('当前分支:'), branch.trim());
      
    } catch (error) {
      console.error(chalk.red('获取配置失败:'), error.message);
    }
  }
}

module.exports = SimpleSync;
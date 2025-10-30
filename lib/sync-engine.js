// lib/sync-engine.js
const chalk = require('chalk');
const GitOperator = require('./git-operator');
const configLoader = require('./config-loader');

class SyncEngine {
  constructor(projectPath = process.cwd()) {
    this.projectPath = projectPath;
    this.git = new GitOperator(projectPath);
    this.config = null;
  }

  // 加载配置并验证
  loadAndValidate() {
    const validation = configLoader.validateConfig(this.projectPath);
    
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    this.config = validation.config;
    return this.config;
  }

  // 显示配置信息
  showConfig() {
    if (!this.config) {
      this.loadAndValidate();
    }

    console.log(chalk.blue('\n📊 Git多仓库同步配置'));
    console.log(chalk.cyan(`配置文件: ${this.config.configFile}`));
    console.log(chalk.cyan(`项目路径: ${this.projectPath}`));
    console.log(chalk.cyan(`远程仓库数量: ${this.config.remotes.length}`));
    
    console.log(chalk.blue('\n🌐 远程仓库列表:'));
    this.config.remotes.forEach((remote, index) => {
      const status = remote.enabled ? chalk.green('✅ 启用') : chalk.yellow('⏸️ 禁用');
      console.log(`${index + 1}. ${remote.name.padEnd(12)} ${remote.url}`);
      console.log(`   ${status} - 第${remote.lineNumber}行`);
    });
  }

  // 设置远程仓库
  setupRemotes() {
    if (!this.config) {
      this.loadAndValidate();
    }

    console.log(chalk.blue('\n🔧 设置远程仓库...'));
    
    // 初始化Git仓库（如果需要）
    this.git.init();

    let successCount = 0;
    
    this.config.remotes.forEach(remote => {
      if (remote.enabled) {
        const result = this.git.setupRemote(remote.name, remote.url);
        if (result.success) {
          successCount++;
          console.log(chalk.green(`✅ ${remote.name} 设置成功`));
        } else {
          console.log(chalk.red(`❌ ${remote.name} 设置失败: ${result.error}`));
        }
      }
    });

    console.log(chalk.green(`\n🎉 远程仓库设置完成 (${successCount}/${this.config.remotes.length})`));
  }

  // 批量推送
  async pushAll(options = {}) {
    if (!this.config) {
      this.loadAndValidate();
    }

    const branch = this.git.getCurrentBranch();
    console.log(chalk.blue(`\n📤 推送到 ${this.config.remotes.length} 个远程仓库，分支: ${branch}`));

    let successCount = 0;
    
    for (const remote of this.config.remotes) {
      if (!remote.enabled) {
        console.log(chalk.gray(`⏸️  跳过已禁用的仓库: ${remote.name}`));
        continue;
      }

      console.log(chalk.cyan(`\n🔄 推送到 ${remote.name}...`));
      
      const result = this.git.push(remote.name, branch, options);
      if (result.success) {
        successCount++;
        console.log(chalk.green(`✅ ${remote.name} 推送成功`));
      } else {
        console.log(chalk.red(`❌ ${remote.name} 推送失败`));
      }
    }

    console.log(chalk.green(`\n🎉 推送完成 (${successCount}/${this.config.remotes.length})`));
    return successCount;
  }

  // 批量拉取
  async pullAll(options = {}) {
    if (!this.config) {
      this.loadAndValidate();
    }

    const branch = this.git.getCurrentBranch();
    console.log(chalk.blue(`\n📥 从 ${this.config.remotes.length} 个远程仓库拉取，分支: ${branch}`));

    let successCount = 0;
    
    for (const remote of this.config.remotes) {
      if (!remote.enabled) {
        console.log(chalk.gray(`⏸️  跳过已禁用的仓库: ${remote.name}`));
        continue;
      }

      console.log(chalk.cyan(`\n🔄 从 ${remote.name} 拉取...`));
      
      const result = this.git.pull(remote.name, branch, options);
      if (result.success) {
        successCount++;
        console.log(chalk.green(`✅ ${remote.name} 拉取成功`));
      } else {
        console.log(chalk.red(`❌ ${remote.name} 拉取失败`));
      }
    }

    console.log(chalk.green(`\n🎉 拉取完成 (${successCount}/${this.config.remotes.length})`));
    return successCount;
  }

  // 批量获取
  async fetchAll() {
    if (!this.config) {
      this.loadAndValidate();
    }

    console.log(chalk.blue(`\n📥 从 ${this.config.remotes.length} 个远程仓库获取更新`));

    let successCount = 0;
    
    for (const remote of this.config.remotes) {
      if (!remote.enabled) {
        console.log(chalk.gray(`⏸️  跳过已禁用的仓库: ${remote.name}`));
        continue;
      }

      console.log(chalk.cyan(`\n🔄 从 ${remote.name} 获取...`));
      
      const result = this.git.fetch(remote.name);
      if (result.success) {
        successCount++;
        console.log(chalk.green(`✅ ${remote.name} 获取成功`));
      } else {
        console.log(chalk.red(`❌ ${remote.name} 获取失败`));
      }
    }

    console.log(chalk.green(`\n🎉 获取完成 (${successCount}/${this.config.remotes.length})`));
    return successCount;
  }
}

module.exports = SyncEngine;
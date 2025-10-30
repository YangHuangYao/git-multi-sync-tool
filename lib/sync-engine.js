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
      const status = remote.enabled
        ? chalk.green('✅ 启用')
        : chalk.yellow('⏸️ 禁用');
      console.log(`${index + 1}. ${remote.name.padEnd(12)} ${remote.url}`);
      console.log(`   ${status} - 第${remote.lineNumber}行`);
    });
  }

  // 显示状态
  showStatus() {
    this.showConfig();

    // 显示Git状态
    console.log(chalk.blue('\n📊 Git状态:'));
    this.git.status();
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
    const totalEnabled = this.config.remotes.filter((r) => r.enabled).length;

    // 将名字结尾的 -数字 视为同一组（同一仓库不同地址），把后续地址作为 push-only URL
    const groups = new Map();
    const getBaseName = (name) => name.replace(/-\d+$/, '');

    for (const remote of this.config.remotes) {
      if (!remote.enabled) continue;
      const base = getBaseName(remote.name);
      if (!groups.has(base)) groups.set(base, []);
      groups.get(base).push(remote);
    }

    for (const [base, remotes] of groups.entries()) {
      const primary = remotes[0];
      const setup = this.git.setupRemote(primary.name, primary.url);
      if (setup.success) {
        successCount++;
        console.log(chalk.green(`✅ ${primary.name} 设置成功`));
      } else {
        console.log(chalk.red(`❌ ${primary.name} 设置失败: ${setup.error}`));
        continue;
      }

      // 其它同组远程作为 push-only URL 附加到主远程
      for (const extra of remotes.slice(1)) {
        const r = this.git.addPushUrl(primary.name, extra.url);
        if (r.success) {
          successCount++;
          console.log(
            chalk.green(`➕ 已为 ${primary.name} 添加 push URL: ${extra.url}`),
          );
        } else {
          console.log(
            chalk.yellow(
              `⚠️  为 ${primary.name} 添加 push URL 失败: ${extra.url}`,
            ),
          );
        }
      }
    }

    console.log(
      chalk.green(`\n🎉 远程仓库设置完成 (${successCount}/${totalEnabled})`),
    );
  }

  // 同步提交 - 修复版本
  syncCommit(message, options = {}) {
    console.log(chalk.blue('🔄 同步提交代码...'));

    try {
      // 修复：使用正确的add方法调用
      console.log(chalk.cyan('📁 添加文件到暂存区...'));

      const addOptions = {};
      if (options.all) {
        addOptions.all = true;
      }

      const addResult = this.git.add(addOptions);
      if (!addResult.success) {
        throw new Error(`添加文件失败: ${addResult.error}`);
      }

      // 若无更改，友好提示并可直接进入推送
      if (!this.git.hasChanges()) {
        console.log(chalk.yellow('⚠️  没有需要提交的更改（工作区干净）'));
      } else {
        console.log(chalk.cyan('💾 提交代码...'));
        const commitResult = this.git.commit(message, options);
        if (!commitResult.success) {
          throw new Error(`提交失败: ${commitResult.error}`);
        }
        console.log(chalk.green('✅ 提交完成'));
      }

      // 如果设置了推送选项，自动推送（透传相关 push 选项）
      if (options.push) {
        console.log(chalk.cyan('🚀 自动推送中...'));
        this.pushAll(options);
      }
    } catch (error) {
      console.error(chalk.red('提交失败:'), error.message);
    }
  }

  // 批量推送
  async pushAll(options = {}) {
    if (!this.config) {
      this.loadAndValidate();
    }

    const branch = this.git.getCurrentBranch();
    if (!branch) {
      throw new Error(
        '无法确定当前分支（可能处于detached HEAD）。请指定分支或切换到分支后重试。',
      );
    }
    // 独立逐个URL推送，互不影响
    const activeRemotes = this.config.remotes.filter((r) => r.enabled);
    console.log(
      chalk.blue(
        `\n📤 推送到 ${activeRemotes.length} 个远程地址，分支: ${branch}`,
      ),
    );

    let successCount = 0;

    for (const remote of activeRemotes) {
      console.log(chalk.cyan(`\n🔄 推送到 ${remote.name}...`));
      const result = this.git.pushToUrl(remote.url, branch, options);
      if (result.success) {
        successCount++;
        console.log(chalk.green(`✅ ${remote.name} 推送成功`));
      } else {
        console.log(chalk.red(`❌ ${remote.name} 推送失败: ${result.error}`));
      }
    }

    console.log(
      chalk.green(`\n🎉 推送完成 (${successCount}/${activeRemotes.length})`),
    );
    return successCount;
  }

  // 批量拉取
  async pullAll(options = {}) {
    if (!this.config) {
      this.loadAndValidate();
    }

    const branch = this.git.getCurrentBranch();
    if (!branch) {
      throw new Error(
        '无法确定当前分支（可能处于detached HEAD）。请指定分支或切换到分支后重试。',
      );
    }
    // 分组：第一组作为主仓库，其余组仅 fetch（除非开启 mergeMirrors）
    const groups = new Map();
    const getBaseName = (name) => name.replace(/-\d+$/, '');
    for (const remote of this.config.remotes) {
      if (!remote.enabled) continue;
      const base = getBaseName(remote.name);
      if (!groups.has(base)) groups.set(base, []);
      groups.get(base).push(remote);
    }

    const groupEntries = Array.from(groups.entries());
    console.log(
      chalk.blue(
        `\n📥 从 ${groupEntries.length} 组远程仓库处理，分支: ${branch}`,
      ),
    );

    let successCount = 0;

    // 从第一组主仓库拉取
    const firstGroup = groupEntries[0];
    const primaryRemote = firstGroup ? firstGroup[1][0] : null;
    if (primaryRemote) {
      console.log(chalk.cyan(`\n📥 从主仓库 ${primaryRemote.name} 拉取...`));
      const result = this.git.pull(primaryRemote.name, branch, options);
      if (result.success) {
        successCount++;
        console.log(chalk.green(`✅ ${primaryRemote.name} 拉取成功`));
      }
    }

    // 其他组仅 fetch（可选合并）
    for (const [base, remotes] of groupEntries.slice(1)) {
      const remote = remotes[0];
      try {
        console.log(
          chalk.cyan(`\n📥 从 ${remote.name} 获取更新（组: ${base}）...`),
        );
        const fetchResult = this.git.fetch(remote.name, branch);
        if (fetchResult.success && options.mergeMirrors) {
          const mergeResult = this.git.merge(`${remote.name}/${branch}`, {
            ffOnly: true,
          });
          if (mergeResult.success) {
            successCount++;
            console.log(chalk.green(`✅ ${remote.name} 合并成功`));
          }
        }
      } catch (error) {
        console.log(
          chalk.yellow(`⚠️  从 ${remote.name} 处理失败:`),
          error.message,
        );
      }
    }

    console.log(
      chalk.green(`\n🎉 拉取完成 (${successCount}/${groupEntries.length})`),
    );
    return successCount;
  }

  // 批量获取
  async fetchAll() {
    if (!this.config) {
      this.loadAndValidate();
    }

    // 按组只对主远程 fetch
    const groups = new Map();
    const getBaseName = (name) => name.replace(/-\d+$/, '');
    for (const remote of this.config.remotes) {
      if (!remote.enabled) continue;
      const base = getBaseName(remote.name);
      if (!groups.has(base)) groups.set(base, []);
      groups.get(base).push(remote);
    }

    console.log(chalk.blue(`\n📥 从 ${groups.size} 组远程仓库获取更新`));

    let successCount = 0;

    for (const [base, remotes] of groups.entries()) {
      const remote = remotes[0];
      console.log(chalk.cyan(`\n🔄 从 ${remote.name} 获取（组: ${base}）...`));
      const result = this.git.fetch(remote.name);
      if (result.success) {
        successCount++;
        console.log(chalk.green(`✅ ${remote.name} 获取成功`));
      } else {
        console.log(chalk.red(`❌ ${remote.name} 获取失败`));
      }
    }

    console.log(chalk.green(`\n🎉 获取完成 (${successCount}/${groups.size})`));
    return successCount;
  }
}

module.exports = SyncEngine;

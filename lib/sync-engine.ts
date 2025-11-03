import chalk from 'chalk';
import GitOperator from './git-operator';
import configLoader, { ConfigResult, RemoteConfig } from './config-loader';

export interface CommitOptions {
  push?: boolean;
  all?: boolean;
  force?: boolean;
  setUpstream?: boolean;
  forceWithLease?: boolean;
  pullBeforePush?: boolean;
  onNonFf?: string;
}

export interface PushOptions {
  force?: boolean;
  setUpstream?: boolean;
  forceWithLease?: boolean;
  pullBeforePush?: boolean;
  onNonFf?: string;
}

export interface PullOptions {
  rebase?: boolean;
  mergeMirrors?: boolean;
}

export interface SyncAllOptions {
  force?: boolean;
  forceWithLease?: boolean;
}

export interface SyncAllResult {
  success: boolean;
  branches: number;
  tags: number;
}

class SyncEngine {
  private projectPath: string;
  private git: GitOperator;
  private config: ConfigResult | null = null;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
    this.git = new GitOperator(projectPath);
  }

  // 加载配置并验证
  loadAndValidate(): ConfigResult {
    const validation = configLoader.validateConfig(this.projectPath);

    if (!validation.valid) {
      throw new Error(validation.error || '配置验证失败');
    }

    if (!validation.config) {
      throw new Error('配置加载失败');
    }

    this.config = validation.config;
    return this.config;
  }

  // 显示配置信息
  showConfig(): void {
    if (!this.config) {
      this.loadAndValidate();
    }

    if (!this.config) {
      return;
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
  showStatus(): void {
    this.showConfig();

    // 显示Git状态
    console.log(chalk.blue('\n📊 Git状态:'));
    this.git.status();
  }

  // 设置远程仓库
  setupRemotes(): void {
    if (!this.config) {
      this.loadAndValidate();
    }

    if (!this.config) {
      return;
    }

    console.log(chalk.blue('\n🔧 设置远程仓库...'));

    // 初始化Git仓库（如果需要）
    this.git.init();

    let successCount = 0;
    const totalEnabled = this.config.remotes.filter((r) => r.enabled).length;

    // 将名字结尾的 -数字 视为同一组（同一仓库不同地址），把后续地址作为 push-only URL
    const groups = new Map<string, RemoteConfig[]>();
    const getBaseName = (name: string) => name.replace(/-\d+$/, '');

    for (const remote of this.config.remotes) {
      if (!remote.enabled) continue;
      const base = getBaseName(remote.name);
      if (!groups.has(base)) groups.set(base, []);
      groups.get(base)!.push(remote);
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
  syncCommit(message: string, options: CommitOptions = {}): void {
    console.log(chalk.blue('🔄 同步提交代码...'));

    try {
      // 修复：使用正确的add方法调用
      console.log(chalk.cyan('📁 添加文件到暂存区...'));

      const addOptions: { all?: boolean } = {};
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
      console.error(chalk.red('提交失败:'), (error as Error).message);
    }
  }

  // 批量推送
  async pushAll(options: PushOptions = {}): Promise<number> {
    if (!this.config) {
      this.loadAndValidate();
    }

    if (!this.config) {
      throw new Error('配置加载失败');
    }

    const branch = this.git.getCurrentBranch();
    if (!branch) {
      throw new Error(
        '无法确定当前分支（可能处于detached HEAD）。请指定分支或切换到分支后重试。',
      );
    }
    // 独立逐个URL推送，互不影响（可选地在推送前对每个URL执行fetch+merge FETCH_HEAD）
    const activeRemotes = this.config.remotes.filter((r) => r.enabled);
    console.log(
      chalk.blue(
        `\n📤 推送到 ${activeRemotes.length} 个远程地址，分支: ${branch}`,
      ),
    );

    let successCount = 0;

    for (const remote of activeRemotes) {
      console.log(chalk.cyan(`\n🔄 推送到 ${remote.name}...`));
      if (options.pullBeforePush) {
        const f = this.git.fetchFromUrl(remote.url, branch);
        if (f.success) {
          const m = this.git.mergeFetchHead({ ffOnly: true });
          if (!m.success) {
            console.log(
              chalk.yellow(
                '⚠️  合并远端更新失败（非快进），已跳过该地址的推送',
              ),
            );
            continue;
          }
        } else {
          console.log(chalk.yellow('⚠️  获取远端更新失败，继续尝试推送'));
        }
      }
      let result = this.git.pushToUrl(remote.url, branch, options);
      if (result.success) {
        successCount++;
        console.log(chalk.green(`✅ ${remote.name} 推送成功`));
        continue;
      }

      // 自动设置上游后重试一次
      if (!options.setUpstream) {
        console.log(chalk.gray('   尝试设置上游后重试...'));
        const retry = this.git.pushToUrl(remote.url, branch, {
          ...options,
          setUpstream: true,
        });
        if (retry.success) {
          successCount++;
          console.log(chalk.green(`✅ ${remote.name} 推送成功（已设置上游）`));
          continue;
        } else {
          result = retry;
        }
      }

      // 非快进策略处理
      const strategy = (options.onNonFf || 'skip').toLowerCase();
      if (strategy === 'rebase') {
        console.log(chalk.gray('   尝试 fetch + rebase 到远端后再推送...'));
        const f2 = this.git.fetchFromUrl(remote.url, branch);
        if (f2.success) {
          const rb = this.git.rebase('FETCH_HEAD');
          if (rb.success) {
            const pr = this.git.pushToUrl(remote.url, branch, options);
            if (pr.success) {
              successCount++;
              console.log(
                chalk.green(`✅ ${remote.name} 推送成功（rebase 后）`),
              );
              continue;
            }
          } else {
            this.git.rebaseAbort();
          }
        }
      } else if (strategy === 'force-with-lease') {
        console.log(chalk.gray('   尝试使用 --force-with-lease 重试...'));
        const pr = this.git.pushToUrl(remote.url, branch, {
          ...options,
          forceWithLease: true,
        });
        if (pr.success) {
          successCount++;
          console.log(
            chalk.green(`✅ ${remote.name} 推送成功（force-with-lease）`),
          );
          continue;
        }
      } else if (strategy === 'force') {
        console.log(chalk.gray('   尝试使用 --force 重试...'));
        const pr = this.git.pushToUrl(remote.url, branch, {
          ...options,
          force: true,
        });
        if (pr.success) {
          successCount++;
          console.log(chalk.green(`✅ ${remote.name} 推送成功（force）`));
          continue;
        }
      }

      console.log(chalk.red(`❌ ${remote.name} 推送失败: ${result.error}`));
    }

    console.log(
      chalk.green(`\n🎉 推送完成 (${successCount}/${activeRemotes.length})`),
    );
    return successCount;
  }

  // 批量拉取
  async pullAll(options: PullOptions = {}): Promise<number> {
    if (!this.config) {
      this.loadAndValidate();
    }

    if (!this.config) {
      throw new Error('配置加载失败');
    }

    const branch = this.git.getCurrentBranch();
    if (!branch) {
      throw new Error(
        '无法确定当前分支（可能处于detached HEAD）。请指定分支或切换到分支后重试。',
      );
    }
    // 分组：第一组作为主仓库，其余组仅 fetch（除非开启 mergeMirrors）
    const groups = new Map<string, typeof this.config.remotes>();
    const getBaseName = (name: string) => name.replace(/-\d+$/, '');
    for (const remote of this.config.remotes) {
      if (!remote.enabled) continue;
      const base = getBaseName(remote.name);
      if (!groups.has(base)) groups.set(base, []);
      groups.get(base)!.push(remote);
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
          (error as Error).message,
        );
      }
    }

    console.log(
      chalk.green(`\n🎉 拉取完成 (${successCount}/${groupEntries.length})`),
    );
    return successCount;
  }

  // 批量获取
  async fetchAll(): Promise<number> {
    if (!this.config) {
      this.loadAndValidate();
    }

    if (!this.config) {
      throw new Error('配置加载失败');
    }

    // 按组只对主远程 fetch
    const groups = new Map<string, typeof this.config.remotes>();
    const getBaseName = (name: string) => name.replace(/-\d+$/, '');
    for (const remote of this.config.remotes) {
      if (!remote.enabled) continue;
      const base = getBaseName(remote.name);
      if (!groups.has(base)) groups.set(base, []);
      groups.get(base)!.push(remote);
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

  // 同步所有分支和tag到指定远程仓库
  async syncAllToRemote(
    targetUrl: string,
    sourceRemote: string = 'origin',
    options: SyncAllOptions = {},
  ): Promise<SyncAllResult> {
    if (!this.config) {
      this.loadAndValidate();
    }

    if (!this.config) {
      throw new Error('配置加载失败');
    }

    // 验证参数
    if (!targetUrl || !targetUrl.trim()) {
      throw new Error('目标URL不能为空');
    }
    if (!sourceRemote || !sourceRemote.trim()) {
      throw new Error('源远程仓库名称不能为空');
    }

    console.log(chalk.blue(`\n🔄 同步所有分支和tag到目标仓库...`));
    console.log(chalk.cyan(`源远程: ${sourceRemote}`));
    console.log(chalk.cyan(`目标URL: ${targetUrl}`));

    // 检查源远程是否存在
    const sourceRemoteUrl = this.git.getRemoteUrl(sourceRemote);
    if (!sourceRemoteUrl) {
      throw new Error(
        `源远程仓库 "${sourceRemote}" 不存在。请先使用 "git-sync setup" 设置远程仓库，或使用正确的远程名称。`,
      );
    }
    console.log(chalk.gray(`源远程URL: ${sourceRemoteUrl}`));

    // 首先从源远程获取所有分支和tag
    console.log(chalk.cyan(`\n📥 从 ${sourceRemote} 获取所有分支和tag...`));
    const fetchResult = this.git.fetchAllFromRemote(sourceRemote);
    if (!fetchResult.success) {
      const errorMsg = fetchResult.error || '未知错误';
      throw new Error(
        `从 ${sourceRemote} 获取失败: ${errorMsg}\n请确保远程仓库 ${sourceRemoteUrl} 可访问且权限正确。`,
      );
    }
    console.log(chalk.green(`✅ 获取成功`));

    // 获取所有分支和tag的信息（用于显示）
    const branches = this.git.getAllRemoteBranches(sourceRemote);
    const tags = this.git.getAllTags();

    console.log(
      chalk.cyan(`\n📊 发现 ${branches.length} 个分支, ${tags.length} 个tag`),
    );

    if (branches.length === 0 && tags.length === 0) {
      console.log(chalk.yellow(`\n⚠️  没有发现任何分支或tag，同步终止`));
      return { success: false, branches: 0, tags: 0 };
    }

    let successCount = 0;
    let totalOperations = 0;

    // 推送所有分支
    if (branches.length > 0) {
      totalOperations++;
      console.log(chalk.cyan(`\n📤 推送所有分支到 ${targetUrl}...`));
      // fetch后，远程分支会成为本地跟踪分支，使用 --all 推送所有本地分支
      const pushOptions = { ...options };
      const pushBranchesResult = this.git.pushAllBranches(
        targetUrl,
        sourceRemote,
        pushOptions,
      );
      if (pushBranchesResult.success) {
        successCount++;
        console.log(
          chalk.green(`✅ 所有分支推送成功 (${branches.length} 个分支)`),
        );
      } else {
        const errorMsg = pushBranchesResult.error || '未知错误';
        console.log(chalk.red(`❌ 分支推送失败: ${errorMsg}`));
        console.log(
          chalk.yellow(
            `提示: 如果目标仓库已有分支，可能需要使用 --force 或 --force-with-lease 选项`,
          ),
        );
      }
    } else {
      console.log(chalk.yellow(`\n⚠️  没有发现任何分支`));
    }

    // 推送所有tag
    if (tags.length > 0) {
      totalOperations++;
      console.log(chalk.cyan(`\n📤 推送所有tag到 ${targetUrl}...`));
      const pushTagsResult = this.git.pushAllTags(targetUrl, options);
      if (pushTagsResult.success) {
        successCount++;
        console.log(chalk.green(`✅ 所有tag推送成功 (${tags.length} 个tag)`));
      } else {
        const errorMsg = pushTagsResult.error || '未知错误';
        console.log(chalk.red(`❌ Tag推送失败: ${errorMsg}`));
        console.log(
          chalk.yellow(
            `提示: 如果目标仓库已有tag，可能需要使用 --force 或 --force-with-lease 选项`,
          ),
        );
      }
    } else {
      console.log(chalk.yellow(`\n⚠️  没有发现任何tag`));
    }

    if (successCount === totalOperations && totalOperations > 0) {
      console.log(
        chalk.green(`\n🎉 同步完成! 所有分支和tag已成功同步到 ${targetUrl}`),
      );
    } else if (totalOperations > 0) {
      console.log(
        chalk.yellow(`\n⚠️  同步部分完成 (${successCount}/${totalOperations})`),
      );
    }

    return {
      success: successCount === totalOperations,
      branches: branches.length,
      tags: tags.length,
    };
  }
}

export default SyncEngine;

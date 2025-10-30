// lib/fixed-git-operator.js
const { execSync } = require('child_process');
const path = require('path');
const chalk = require('chalk');

class FixedGitOperator {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
    }

    // 执行Git命令
    exec(command, args = [], options = {}) {
        const fullCommand = ['git', command, ...args].join(' ');
        
        const defaultOptions = {
            cwd: this.projectPath,
            stdio: options.silent ? 'pipe' : 'inherit',
            encoding: 'utf-8'
        };

        try {
            console.log(chalk.blue(`$ ${fullCommand}`));
            const result = execSync(fullCommand, { ...defaultOptions, ...options });
            return {
                success: true,
                output: result ? result.trim() : '',
                command: fullCommand
            };
        } catch (error) {
            if (!options.silent) {
                console.error(chalk.red(`命令执行失败: ${fullCommand}`));
            }
            return {
                success: false,
                error: error.message,
                command: fullCommand
            };
        }
    }

    // 修复的推送方法
    push(remote, branch, options = {}) {
        const args = ['push'];
        if (options.force) args.push('--force');
        if (options.setUpstream) args.push('--set-upstream');
        
        // 正确的参数顺序
        args.push(remote);
        args.push(branch);
        
        return this.exec('push', args);
    }

    // 获取当前分支
    getCurrentBranch() {
        const result = this.exec('branch', ['--show-current'], { silent: true });
        return result.success ? result.output : 'main';
    }

    // 获取远程仓库列表
    getRemotes() {
        const result = this.exec('remote', [], { silent: true });
        if (!result.success) return [];
        
        return result.output.split('\n').filter(name => name.trim());
    }
}

module.exports = FixedGitOperator;
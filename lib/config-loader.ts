import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

export interface RemoteConfig {
  name: string;
  url: string;
  enabled: boolean;
  lineNumber: number;
}

export interface ConfigResult {
  exists: boolean;
  remotes: RemoteConfig[];
  configPath?: string;
  configFile?: string;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  config?: ConfigResult;
}

export interface GitUrlValidation {
  valid: boolean;
  reason?: string;
}

class ConfigLoader {
  private configFiles: string[] = [
    '.git-remotes.txt',
    'git-remotes.txt',
    '.git-remotes',
    'git-remotes',
  ];

  // 查找配置文件
  findConfigFile(projectPath: string = process.cwd()): string | null {
    for (const configFile of this.configFiles) {
      const configPath = path.join(projectPath, configFile);
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }
    return null;
  }

  // 从环境变量读取配置
  loadConfigFromEnv(): RemoteConfig[] {
    const remotes: RemoteConfig[] = [];

    // 支持多种环境变量格式
    // GIT_SYNC_REMOTES: "url1,url2,url3"
    // GIT_SYNC_REMOTE_0, GIT_SYNC_REMOTE_1, ...
    // GIT_SYNC_REMOTE_URL_0, GIT_SYNC_REMOTE_NAME_0, ...

    // 方式1: GIT_SYNC_REMOTES (逗号分隔)
    if (process.env.GIT_SYNC_REMOTES) {
      const urls = process.env.GIT_SYNC_REMOTES.split(',').map((u) => u.trim());
      urls.forEach((url, index) => {
        if (url) {
          const validation = this.validateGitUrl(url);
          if (validation.valid) {
            remotes.push({
              name: this.generateRemoteName(
                url,
                index,
                remotes.map((r) => r.name),
              ),
              url: url,
              enabled: true,
              lineNumber: index + 1,
            });
          }
        }
      });
    }

    // 方式2: GIT_SYNC_REMOTE_0, GIT_SYNC_REMOTE_1, ...
    let index = 0;
    while (process.env[`GIT_SYNC_REMOTE_${index}`]) {
      const url = process.env[`GIT_SYNC_REMOTE_${index}`]?.trim();
      if (url) {
        const validation = this.validateGitUrl(url);
        if (validation.valid) {
          remotes.push({
            name: this.generateRemoteName(
              url,
              index,
              remotes.map((r) => r.name),
            ),
            url: url,
            enabled: true,
            lineNumber: index + 1,
          });
        }
      }
      index++;
    }

    // 方式3: GIT_SYNC_REMOTE_URL_0 + GIT_SYNC_REMOTE_NAME_0 (配对格式)
    index = 0;
    while (process.env[`GIT_SYNC_REMOTE_URL_${index}`]) {
      const url = process.env[`GIT_SYNC_REMOTE_URL_${index}`]?.trim();

      if (!url) {
        index++;
        continue;
      }

      const name =
        process.env[`GIT_SYNC_REMOTE_NAME_${index}`]?.trim() ||
        this.generateRemoteName(
          url,
          index,
          remotes.map((r) => r.name),
        );

      const validation = this.validateGitUrl(url);
      if (validation.valid) {
        remotes.push({
          name: name,
          url: url,
          enabled: true,
          lineNumber: index + 1,
        });
      }
      index++;
    }

    return remotes;
  }

  // 读取并解析配置文件
  loadConfig(projectPath: string = process.cwd()): ConfigResult {
    // 优先级1: 环境变量配置
    const envRemotes = this.loadConfigFromEnv();
    if (envRemotes.length > 0) {
      return {
        exists: true,
        remotes: envRemotes,
        configPath: 'environment',
        configFile: 'environment variables',
      };
    }

    // 优先级2: 配置文件
    const configPath = this.findConfigFile(projectPath);

    if (!configPath) {
      return {
        exists: false,
        remotes: [],
        error: '未找到配置文件',
      };
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      const remotes = this.parseConfigContent(content, configPath);

      return {
        exists: true,
        remotes: remotes,
        configPath: configPath,
        configFile: path.basename(configPath),
      };
    } catch (error) {
      return {
        exists: true,
        remotes: [],
        error: `配置文件读取失败: ${(error as Error).message}`,
      };
    }
  }

  // 解析配置文件内容
  parseConfigContent(content: string, configPath: string): RemoteConfig[] {
    const lines = content.split('\n');
    const remotes: RemoteConfig[] = [];
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();

      // 跳过空行和注释
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // 解析远程仓库配置
      const remote = this.parseRemoteLine(
        trimmedLine,
        lineNumber,
        remotes.length,
        remotes.map((r) => r.name),
      );
      if (remote) {
        remotes.push(remote);
      }
    }

    return remotes;
  }

  // 解析单行配置
  parseRemoteLine(
    line: string,
    lineNumber: number,
    currentIndex: number,
    existingNames: string[] = [],
  ): RemoteConfig | null {
    let remoteName = '';
    let remoteUrl = '';

    // 检查是否包含名称
    if (line.includes(' ')) {
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        // 处理 [name] url 格式
        if (parts[0].startsWith('[') && parts[0].endsWith(']')) {
          remoteName = parts[0].slice(1, -1);
          remoteUrl = parts.slice(1).join(' ');
        } else {
          // 处理 name url 格式
          remoteName = parts[0];
          remoteUrl = parts.slice(1).join(' ');
        }
      }
    } else {
      // 只有URL，自动生成名称
      remoteUrl = line;
      remoteName = this.generateRemoteName(
        remoteUrl,
        currentIndex,
        existingNames,
      );
    }

    // 验证URL
    const validation = this.validateGitUrl(remoteUrl);
    if (!validation.valid) {
      console.log(
        chalk.yellow(
          `⚠️  第${lineNumber}行: 无效的Git URL "${remoteUrl}"，原因: ${
            validation.reason || '格式不正确'
          }，已跳过`,
        ),
      );
      return null;
    }

    return {
      name: remoteName,
      url: remoteUrl,
      enabled: true,
      lineNumber: lineNumber,
    };
  }

  // 生成远程仓库名称
  generateRemoteName(
    url: string,
    index: number,
    existingNames: string[] = [],
  ): string {
    // 尝试从URL提取有意义的名称
    try {
      const urlMatch = url.match(/\/([^\/]+?)\.git$/);
      if (urlMatch && urlMatch[1]) {
        const base = urlMatch[1];
        let candidate = base;
        let suffix = 1;
        while (existingNames.includes(candidate)) {
          suffix += 1;
          candidate = `${base}-${suffix}`;
        }
        return candidate;
      }
    } catch (error) {
      // 忽略错误，使用默认名称
    }

    // 使用索引作为后备
    let candidate = index === 0 ? 'origin' : `remote${index + 1}`;
    let suffix = 1;
    while (existingNames.includes(candidate)) {
      suffix += 1;
      candidate = `${candidate}-${suffix}`;
    }
    return candidate;
  }

  // 强校验Git URL（返回原因）
  validateGitUrl(url: string): GitUrlValidation {
    if (!url || typeof url !== 'string') {
      return { valid: false, reason: 'URL为空或类型错误' };
    }

    const trimmed = url.trim();
    if (trimmed.length < 10) {
      return { valid: false, reason: 'URL长度过短' };
    }

    // 支持的常见格式：
    // - HTTPS: https://host/owner/repo.git
    // - HTTP:  http://host/owner/repo.git
    // - SSH:   git@host:owner/repo(.git)
    // - GIT:   git://host/owner/repo.git
    const httpsRegex = /^(https:\/\/|http:\/\/)\S+\/.+\/.+?(\.git)?$/i;
    const sshRegex = /^\S+@\S+:[\w.-]+\/.+?(\.git)?$/i;
    const gitRegex = /^git:\/\/\S+\/.+\/.+?(\.git)?$/i;

    const looksValid =
      httpsRegex.test(trimmed) ||
      sshRegex.test(trimmed) ||
      gitRegex.test(trimmed);
    if (!looksValid) {
      return { valid: false, reason: '不匹配常见的SSH/HTTP(S)/GIT协议格式' };
    }

    // 建议以 .git 结尾，但不强制（部分服务允许省略）
    return { valid: true };
  }

  // 兼容旧方法（保留API）
  isValidGitUrl(url: string): boolean {
    return this.validateGitUrl(url).valid;
  }

  // 创建示例配置文件
  createSampleConfig(projectPath: string = process.cwd()): string {
    const sampleContent = `# Git多仓库同步配置文件
# 每行一个远程仓库URL，支持多种格式：

# 简单URL格式（自动生成名称）
https://github.com/username/repository.git

# 命名格式：名称 URL
origin https://github.com/username/repo1.git
backup https://gitee.com/username/repo1.git

# 带括号的命名格式
[company] https://git.company.com/team/project.git
[mirror] https://mirror.com/user/repo.git

# 注释以#开头，空行会被忽略

# 支持以下协议：
# HTTPS: https://github.com/user/repo.git
# SSH: git@github.com:user/repo.git
# 公司内部Git: http://git.company.com/repo.git
`;

    const configPath = path.join(projectPath, '.git-remotes.txt');
    fs.writeFileSync(configPath, sampleContent);

    return configPath;
  }

  // 验证配置文件
  validateConfig(projectPath: string = process.cwd()): ValidationResult {
    const config = this.loadConfig(projectPath);

    if (!config.exists) {
      return {
        valid: false,
        error: `未找到配置文件，请创建以下文件之一: ${this.configFiles.join(
          ', ',
        )}`,
      };
    }

    if (config.error) {
      return {
        valid: false,
        error: config.error,
      };
    }

    if (config.remotes.length === 0) {
      return {
        valid: false,
        error: '配置文件中没有有效的远程仓库配置',
      };
    }

    return {
      valid: true,
      config: config,
    };
  }
}

export default new ConfigLoader();

// lib/config-loader.js
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class ConfigLoader {
  constructor() {
    this.configFiles = [
      '.git-remotes.txt',     // 主配置文件
      'git-remotes.txt',      // 备用配置文件
      '.git-remotes',         // 无后缀配置
      'git-remotes'           // 无后缀配置
    ];
  }

  // 查找配置文件
  findConfigFile(projectPath = process.cwd()) {
    for (const configFile of this.configFiles) {
      const configPath = path.join(projectPath, configFile);
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }
    return null;
  }

  // 读取并解析配置文件
  loadConfig(projectPath = process.cwd()) {
    const configPath = this.findConfigFile(projectPath);
    
    if (!configPath) {
      return {
        exists: false,
        remotes: [],
        error: '未找到配置文件'
      };
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      const remotes = this.parseConfigContent(content, configPath);
      
      return {
        exists: true,
        remotes: remotes,
        configPath: configPath,
        configFile: path.basename(configPath)
      };
    } catch (error) {
      return {
        exists: true,
        remotes: [],
        error: `配置文件读取失败: ${error.message}`
      };
    }
  }

  // 解析配置文件内容
  parseConfigContent(content, configPath) {
    const lines = content.split('\n');
    const remotes = [];
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();
      
      // 跳过空行和注释
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // 解析远程仓库配置
      const remote = this.parseRemoteLine(trimmedLine, lineNumber, configPath);
      if (remote) {
        remotes.push(remote);
      }
    }

    return remotes;
  }

  // 解析单行配置
  parseRemoteLine(line, lineNumber, configPath) {
    // 支持多种格式：
    // 1. 简单URL: https://github.com/user/repo.git
    // 2. 命名格式: origin https://github.com/user/repo.git
    // 3. 带名称格式: [backup] https://gitee.com/user/repo.git
    
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
      remoteName = this.generateRemoteName(remoteUrl, remotes.length);
    }

    // 验证URL
    if (!this.isValidGitUrl(remoteUrl)) {
      console.log(chalk.yellow(`⚠️  第${lineNumber}行: 无效的Git URL "${remoteUrl}"，已跳过`));
      return null;
    }

    // 生成默认名称（如果需要）
    if (!remoteName) {
      remoteName = this.generateRemoteName(remoteUrl, remotes.length);
    }

    return {
      name: remoteName,
      url: remoteUrl,
      enabled: true,
      lineNumber: lineNumber
    };
  }

  // 生成远程仓库名称
  generateRemoteName(url, index) {
    // 尝试从URL提取有意义的名称
    const urlMatch = url.match(/\/([^\/]+?)\.git$/);
    if (urlMatch) {
      return urlMatch[1];
    }
    
    // 使用索引作为后备
    return index === 0 ? 'origin' : `remote${index + 1}`;
  }

  // 验证Git URL
  isValidGitUrl(url) {
    return url && (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('git@') ||
      url.startsWith('ssh://') ||
      url.endsWith('.git')
    );
  }

  // 创建示例配置文件
  createSampleConfig(projectPath = process.cwd()) {
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

  // 验证配置文件是否存在
  validateConfig(projectPath = process.cwd()) {
    const config = this.loadConfig(projectPath);
    
    if (!config.exists) {
      return {
        valid: false,
        error: `未找到配置文件，请创建以下文件之一: ${this.configFiles.join(', ')}`
      };
    }

    if (config.error) {
      return {
        valid: false,
        error: config.error
      };
    }

    if (config.remotes.length === 0) {
      return {
        valid: false,
        error: '配置文件中没有有效的远程仓库配置'
      };
    }

    return {
      valid: true,
      config: config
    };
  }
}

module.exports = new ConfigLoader();
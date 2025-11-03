// scripts/generate-changelog.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.blue('📝 生成版本日志...'));

try {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const currentVersion = packageJson.version;
  const repoUrl =
    packageJson.repository?.url?.replace('.git', '').replace('git+', '') || '';

  // 获取最新的git tag
  let lastTag = null;
  try {
    const tags = execSync('git tag --sort=-creatordate', {
      encoding: 'utf-8',
      stdio: 'pipe',
    })
      .trim()
      .split('\n')
      .filter(Boolean);

    // 找到当前版本之前的tag
    lastTag =
      tags.find((tag) => {
        const tagVersion = tag.replace(/^v/, '');
        return tagVersion !== currentVersion;
      }) ||
      tags[0] ||
      null;
  } catch (error) {
    console.log(chalk.yellow('⚠️  无法获取git标签，将使用所有提交'));
  }

  // 获取提交历史
  let gitLogCommand = 'git log --pretty=format:"%h|%s|%b" --no-merges';
  if (lastTag) {
    gitLogCommand += ` ${lastTag}..HEAD`;
  } else {
    // 如果没有tag，只获取最近的提交
    gitLogCommand += ' -20';
  }

  let commits = [];
  try {
    const logOutput = execSync(gitLogCommand, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    commits = logOutput
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [hash, subject, ...body] = line.split('|');
        return {
          hash: hash?.trim() || '',
          subject: subject?.trim() || '',
          body: body.join('|').trim(),
        };
      })
      .filter((commit) => commit.subject && commit.subject.length > 0);
  } catch (error) {
    console.log(chalk.yellow('⚠️  无法获取git提交历史'));
  }

  // 如果没有提交，使用conventional-changelog生成
  if (commits.length === 0) {
    console.log(
      chalk.yellow('未找到新的提交，尝试使用conventional-changelog...'),
    );
    try {
      execSync('npx conventional-changelog -p angular -i CHANGELOG.md -s', {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    } catch (error) {
      console.log(chalk.yellow('conventional-changelog也未能生成日志'));
    }
  }

  // 分类提交
  const categorized = {
    feat: [],
    fix: [],
    perf: [],
    refactor: [],
    docs: [],
    style: [],
    test: [],
    build: [],
    ci: [],
    chore: [],
    other: [],
  };

  commits.forEach((commit) => {
    const match = commit.subject.match(
      /^(feat|fix|perf|refactor|docs|style|test|build|ci|chore)(\(.+?\))?:\s*(.+)/i,
    );
    if (match) {
      const type = match[1].toLowerCase();
      const scope = match[2] || '';
      const message = match[3];

      if (categorized[type]) {
        categorized[type].push({
          scope: scope.replace(/[()]/g, ''),
          message: message,
          hash: commit.hash,
        });
      }
    } else {
      categorized.other.push({
        message: commit.subject,
        hash: commit.hash,
      });
    }
  });

  // 生成changelog内容
  const emojiMap = {
    feat: '✨',
    fix: '🔧',
    perf: '⚡',
    refactor: '♻️',
    docs: '📚',
    style: '💄',
    test: '🧪',
    build: '📦',
    ci: '👷',
    chore: '🔨',
    other: '📝',
  };

  const typeMap = {
    feat: '新增功能',
    fix: '修复问题',
    perf: '性能优化',
    refactor: '重构',
    docs: '文档',
    style: '样式',
    test: '测试',
    build: '构建',
    ci: 'CI',
    chore: '杂项',
    other: '其他',
  };

  let changelogLines = [];
  changelogLines.push(`### v${currentVersion}\n`);

  // 按顺序添加各个类型的更改
  const order = [
    'feat',
    'fix',
    'perf',
    'refactor',
    'docs',
    'build',
    'ci',
    'test',
    'chore',
    'other',
  ];

  order.forEach((type) => {
    const items = categorized[type];
    if (items.length > 0) {
      const emoji = emojiMap[type];
      const typeName = typeMap[type];

      items.forEach((item) => {
        const scopeText = item.scope ? `**${item.scope}**：` : '';
        const message = item.message.replace(/^\[.*?\]\s*/, ''); // 移除方括号标签
        changelogLines.push(`- ${emoji} ${scopeText}${message}`);
      });
    }
  });

  if (changelogLines.length === 1) {
    // 如果没有分类的提交，添加一个通用条目
    changelogLines.push('- 📝 更新内容');
  }

  const newChangelog = changelogLines.join('\n') + '\n';

  // 读取README.md
  const readmePath = path.join(__dirname, '..', 'README.md');
  let readmeContent = fs.readFileSync(readmePath, 'utf-8');

  // 检查是否已存在当前版本的日志
  const currentVersionPattern = new RegExp(
    `### v${currentVersion.replace(/\./g, '\\.')}(\\s|\\n)`,
  );
  if (currentVersionPattern.test(readmeContent)) {
    console.log(
      chalk.yellow(`⚠️  版本 v${currentVersion} 的日志已存在，跳过生成`),
    );
    console.log(
      chalk.gray(
        '提示：如需重新生成，请先手动删除README.md中该版本的日志条目',
      ),
    );
    return;
  }

  // 查找"更新日志"部分
  const changelogSectionRegex = /(## 📝 更新日志\s*\n)/;
  const match = readmeContent.match(changelogSectionRegex);

  if (match) {
    // 在"更新日志"标题后插入新版本日志
    const insertPosition = match.index + match[0].length;
    readmeContent =
      readmeContent.slice(0, insertPosition) +
      newChangelog +
      readmeContent.slice(insertPosition);
  } else {
    // 如果找不到"更新日志"部分，在文件末尾添加
    console.log(chalk.yellow('⚠️  未找到"更新日志"部分，将在文件末尾添加'));
    readmeContent += '\n\n## 📝 更新日志\n\n' + newChangelog;
  }

  // 更新README.md
  fs.writeFileSync(readmePath, readmeContent, 'utf-8');

  console.log(chalk.green(`✅ 已生成版本日志 v${currentVersion}`));
  console.log(chalk.gray(`共处理 ${commits.length} 个提交`));

  // 显示生成的changelog预览
  console.log(chalk.cyan('\n生成的日志预览:'));
  console.log(chalk.gray(newChangelog));
} catch (error) {
  console.error(chalk.red(`生成版本日志时出错: ${error.message}`));
  console.error(error.stack);
  process.exit(1);
}

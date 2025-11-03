/**
 * CI/CD 环境检测工具
 * 自动检测当前运行的 CI/CD 环境并返回相关信息
 */

export interface CIEnvironment {
  isCI: boolean;
  name: string;
  vendor: string;
  jobName?: string;
  branch?: string;
  commit?: string;
}

class CIDetector {
  private ciEnvironments: Map<string, CIEnvironment> = new Map();

  constructor() {
    this.initializeCIMap();
  }

  private initializeCIMap(): void {
    // GitHub Actions
    if (process.env.GITHUB_ACTIONS === 'true') {
      this.ciEnvironments.set('github', {
        isCI: true,
        name: 'GitHub Actions',
        vendor: 'github',
        jobName: process.env.GITHUB_JOB,
        branch: process.env.GITHUB_REF?.replace('refs/heads/', ''),
        commit: process.env.GITHUB_SHA,
      });
    }

    // GitLab CI
    if (process.env.GITLAB_CI === 'true') {
      this.ciEnvironments.set('gitlab', {
        isCI: true,
        name: 'GitLab CI',
        vendor: 'gitlab',
        jobName: process.env.CI_JOB_NAME,
        branch: process.env.CI_COMMIT_REF_NAME,
        commit: process.env.CI_COMMIT_SHA,
      });
    }

    // Jenkins
    if (process.env.JENKINS_URL) {
      this.ciEnvironments.set('jenkins', {
        isCI: true,
        name: 'Jenkins',
        vendor: 'jenkins',
        jobName: process.env.JOB_NAME,
        branch: process.env.GIT_BRANCH?.replace('origin/', ''),
        commit: process.env.GIT_COMMIT,
      });
    }

    // CircleCI
    if (process.env.CIRCLECI === 'true') {
      this.ciEnvironments.set('circleci', {
        isCI: true,
        name: 'CircleCI',
        vendor: 'circleci',
        jobName: process.env.CIRCLE_JOB,
        branch: process.env.CIRCLE_BRANCH,
        commit: process.env.CIRCLE_SHA1,
      });
    }

    // Travis CI
    if (process.env.TRAVIS === 'true') {
      this.ciEnvironments.set('travis', {
        isCI: true,
        name: 'Travis CI',
        vendor: 'travis',
        jobName: process.env.TRAVIS_JOB_NAME,
        branch: process.env.TRAVIS_BRANCH,
        commit: process.env.TRAVIS_COMMIT,
      });
    }

    // Azure DevOps
    if (process.env.AZURE_HTTP_USER_AGENT || process.env.BUILD_BUILDID) {
      this.ciEnvironments.set('azure', {
        isCI: true,
        name: 'Azure DevOps',
        vendor: 'azure',
        jobName: process.env.AGENT_JOBNAME,
        branch: process.env.BUILD_SOURCEBRANCHNAME,
        commit: process.env.BUILD_SOURCEVERSION,
      });
    }

    // AWS CodeBuild
    if (process.env.CODEBUILD_BUILD_ID) {
      this.ciEnvironments.set('codebuild', {
        isCI: true,
        name: 'AWS CodeBuild',
        vendor: 'aws',
        jobName: process.env.CODEBUILD_BUILD_ID,
        branch: process.env.CODEBUILD_SOURCE_VERSION,
        commit: process.env.CODEBUILD_RESOLVED_SOURCE_VERSION,
      });
    }

    // AppVeyor
    if (process.env.APPVEYOR === 'True') {
      this.ciEnvironments.set('appveyor', {
        isCI: true,
        name: 'AppVeyor',
        vendor: 'appveyor',
        jobName: process.env.APPVEYOR_JOB_NAME,
        branch: process.env.APPVEYOR_REPO_BRANCH,
        commit: process.env.APPVEYOR_REPO_COMMIT,
      });
    }

    // TeamCity
    if (process.env.TEAMCITY_VERSION) {
      this.ciEnvironments.set('teamcity', {
        isCI: true,
        name: 'TeamCity',
        vendor: 'teamcity',
        jobName: process.env.TEAMCITY_BUILDCONF_NAME,
        branch: process.env.BRANCH_NAME,
        commit: process.env.BUILD_VCS_NUMBER,
      });
    }

    // Bamboo
    if (process.env.bamboo_buildKey) {
      this.ciEnvironments.set('bamboo', {
        isCI: true,
        name: 'Bamboo',
        vendor: 'bamboo',
        jobName: process.env.bamboo_buildKey,
        branch: process.env.bamboo_planRepository_branch,
        commit: process.env.bamboo_planRepository_revision,
      });
    }

    // 通用 CI 检测（通过 CI 环境变量）
    if (process.env.CI === 'true' || process.env.CI === '1') {
      // 如果没有匹配到具体的 CI 环境，使用通用 CI
      if (this.ciEnvironments.size === 0) {
        this.ciEnvironments.set('generic', {
          isCI: true,
          name: 'CI Environment',
          vendor: 'generic',
          branch: process.env.GIT_BRANCH?.replace('origin/', ''),
          commit: process.env.GIT_COMMIT || process.env.COMMIT_SHA,
        });
      }
    }
  }

  /**
   * 检测当前是否为 CI 环境
   */
  detect(): CIEnvironment {
    // 优先返回已检测到的具体 CI 环境
    if (this.ciEnvironments.size > 0) {
      return Array.from(this.ciEnvironments.values())[0];
    }

    // 如果没有检测到，返回默认值
    return {
      isCI: false,
      name: 'Local',
      vendor: 'local',
    };
  }

  /**
   * 是否为 CI 环境
   */
  isCI(): boolean {
    return this.detect().isCI;
  }

  /**
   * 获取 CI 环境名称
   */
  getCIName(): string {
    return this.detect().name;
  }

  /**
   * 检查是否应该使用静默模式（在 CI 环境中默认启用）
   */
  shouldBeQuiet(): boolean {
    if (this.isCI()) {
      // 在 CI 环境中，除非明确指定 --verbose，否则默认静默
      return process.env.GIT_SYNC_VERBOSE !== 'true';
    }
    return false;
  }
}

export default new CIDetector();

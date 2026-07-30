export type ModerationResultStatus = 'restricted' | 'released';

export class RiskService {
  checkMessageRate(countInMinute: number) {
    if (countInMinute > 60) throw new Error('rate limited');
    return true;
  }

  buildModerationResult(input: { blocked: boolean; projectName?: string }) {
    const projectName = input.projectName?.trim() || '柬单聊';

    if (input.blocked) {
      return {
        status: 'restricted' as ModerationResultStatus,
        content: `你的${projectName}账号已被限制使用，请联系管理员了解详情。`
      };
    }

    return {
      status: 'released' as ModerationResultStatus,
      content: `你的${projectName}账号状态已恢复，可以继续使用。`
    };
  }
}

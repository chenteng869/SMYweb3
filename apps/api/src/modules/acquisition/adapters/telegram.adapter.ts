import { Injectable, Logger } from '@nestjs/common';
import { PlatformAdapter } from './platform-adapter.interface';
import {
  PlatformCollectOptions,
  RawLead,
  NormalizedLead,
  TelegramRawData,
} from '../types/acquisition.types';

/**
 * Telegram 平台适配器
 *
 * 负责从 Telegram 平台采集群组/频道成员数据和标准化处理
 * 当前为 Mock 实现，Phase 3 将接入 Telegram Bot API / MTProto
 */
@Injectable()
export class TelegramAdapter implements PlatformAdapter {
  readonly platformName = 'telegram';
  private readonly logger = new Logger(TelegramAdapter.name);

  /**
   * 从 Telegram 获取群组/频道成员线索数据
   *
   * TODO (Phase 3): 接入 Telegram Bot API
   * - 使用 Bot Token 认证
   * - 调用 getChat 接口获取群组/频道信息
   * - 调用 getChatMembers 接口获取成员列表（需管理员权限）
   * - 对于大型群组使用 MTProto 协议
   * - 注意隐私设置：部分用户可能隐藏个人信息
   *
   * @param query 群组/频道 ID 或搜索关键词
   * @param options 可选参数（如成员数量限制、是否包含机器人等）
   * @returns 原始 Telegram 用户/群组数据数组
   */
  async fetchLeads(query: string, options?: PlatformCollectOptions): Promise<RawLead[]> {
    this.logger.log(`[Telegram] 开始采集，查询: ${query}，选项: ${JSON.stringify(options)}`);

    // TODO (Phase 3): 替换为真实 API 调用
    // const botToken = process.env.TELEGRAM_BOT_TOKEN;
    // const chatId = query.startsWith('@') ? query : `@${query}`;
    // const chatResponse = await fetch(
    //   `https://api.telegram.org/bot${botToken}/getChat?chat_id=${encodeURIComponent(chatId)}`
    // );
    // const membersResponse = await fetch(
    //   `https://api.telegram.org/bot${botToken}/getChatMembers?chat_id=${encodeURIComponent(chatId)}&limit=${options?.limit || 100}`
    // );

    const mockData = this.generateMockTelegramData(query, options?.limit || 50);

    this.logger.log(`[Telegram] 采集完成，共 ${mockData.length} 条数据`);
    return mockData;
  }

  /**
   * 将 Telegram 原始数据标准化为 NormalizedLead 格式
   *
   * Telegram 特有字段映射：
   * - id -> user_id / chat_id
   * - first_name + last_name -> display_name
   * - username -> username (@xxx)
   * - bio -> bio（仅限 bot 可见）
   * - member_count (for channels/groups) -> follower_count
   * - type (channel/supergroup/group) -> account_type
   *
   * @param rawLeads Telegram 原始数据数组
   * @returns 标准化后的线索数据数组
   */
  async normalizeData(rawLeads: RawLead[]): Promise<NormalizedLead[]> {
    return rawLeads.map((raw) => {
      const now = new Date();
      const rawAny = raw as Record<string, unknown>;
      const tgRaw = raw as TelegramRawData;
      const isChannelOrGroup =
        !!tgRaw.member_count || rawAny.type === 'channel' || rawAny.type === 'supergroup';
      const originalId =
        rawAny.id ||
        rawAny.user_id ||
        rawAny.chat_id ||
        `tg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      // 组合姓名
      const firstName = String(rawAny.first_name || '');
      const lastName = String(rawAny.last_name || '');
      const displayName =
        rawAny.title ||
        rawAny.name ||
        [firstName, lastName].filter(Boolean).join(' ') ||
        'Telegram 用户';

      return {
        id: `telegram:${originalId}`,
        platform: 'telegram',
        displayName: String(displayName),
        username: rawAny.username as string | undefined,
        bio: (rawAny.bio as string | undefined) || (rawAny.description as string | undefined),
        followerCount: isChannelOrGroup ? this.parseNumber(tgRaw.member_count) : undefined,
        followingCount: undefined,
        postCount: isChannelOrGroup ? this.parseNumber(rawAny.message_count) : undefined,
        engagementRate: isChannelOrGroup ? this.calculateTelegramEngagement(raw) : undefined,
        avatarUrl: (rawAny.photo as Record<string, unknown>)?.small_file_id
          ? `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${((rawAny.photo as Record<string, unknown>).small_file_id as string)}`
          : undefined,
        profileUrl: rawAny.username
          ? `https://t.me/${String(rawAny.username).replace('@', '')}`
          : undefined,
        lastPostAt: rawAny.last_message_date
          ? new Date(Number(rawAny.last_message_date) * 1000)
          : undefined,
        tags: this.extractTelegramTags(raw),
        contactInfo: {
          // Telegram 通常不公开联系方式，除非是公开的 Bot 或 Channel
          email: undefined,
          phone: undefined,
          website: rawAny.username
            ? `https://t.me/${String(rawAny.username).replace('@', '')}`
            : undefined,
        },
        rawJson: JSON.stringify(raw),
        collectedAt: now,
      };
    });
  }

  private parseNumber(value: unknown): number | undefined {
    if (value === undefined || value === null) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 生成模拟的 Telegram 用户/群组数据
   */
  private generateMockTelegramData(query: string, limit: number): RawLead[] {
    const firstNames = [
      'Alex',
      'Sarah',
      'Mike',
      'Emily',
      'David',
      'Jessica',
      'Kevin',
      'Amanda',
      'Ryan',
      'Laura',
      'Brian',
      'Nicole',
      'Steven',
      'Rachel',
      'Tom',
    ];
    const lastNames = [
      'Chen',
      'Wang',
      'Johnson',
      'Liu',
      'Zhang',
      'Li',
      'Brown',
      'Wu',
      'Taylor',
      'Huang',
      'Kim',
      'Anderson',
      'Lee',
      'Park',
      'Smith',
    ];
    const usernames = [
      'alexctech',
      'sarahw_dev',
      'mikej_crypto',
      'emlyl_ai',
      'davidz_web3',
      'jessicadesign',
      'kevinb_saas',
      'amandaw_prod',
      'ryan_k_invest',
      'lauramarketing',
      'brianl_code',
      'nicolep_data',
      'stevew_btc',
      'rachelg_ux',
      'tomh_devops',
    ];
    const groupNames = [
      'AI 技术交流群',
      'Web3 开发者社区',
      '区块链投资圈',
      '创业者联盟',
      '数字货币讨论组',
      '开源项目协作',
      '产品经理之家',
      'SaaS 创业营',
      '加密货币交易',
      'DeFi 学习小组',
      'NFT 收藏家',
      '元宇宙探索',
    ];
    const bios = [
      'AI 研究员 | 开源爱好者 | 分享技术见解',
      'Web3 开发者 | 智能合约审计 | 寻找合作机会',
      '连续创业者 | 已创立 3 家公司 | 投资 AI 和 Crypto 方向',
      '产品经理 | 专注 SaaS 领域 | 乐于分享产品思维',
      '全栈开发者 | 远程工作倡导者 | 开源贡献者',
      '投资人 | 关注早期项目 | DM 发送 BP',
      '数据分析师 | Python / SQL | 用数据驱动决策',
      '独立开发者 | 正在构建下一个大产品',
    ];

    const results: RawLead[] = [];
    const isGroupSearch =
      query.includes('group') || query.includes('群') || query.includes('community');
    const itemCount = Math.min(limit, isGroupSearch ? groupNames.length : firstNames.length);

    for (let i = 0; i < itemCount; i++) {
      if (isGroupSearch) {
        // 返回群组/频道数据
        const memberCount = Math.floor(Math.random() * 50000) + 100;
        results.push({
          id: `-100${Math.floor(Math.random() * 9000000000) + 1000000000}`,
          chat_id: `@${query.toLowerCase().replace(/\s+/g, '')}_${i}`,
          title: groupNames[i % groupNames.length],
          type: Math.random() > 0.5 ? 'supergroup' : 'channel',
          username: `${query.toLowerCase().replace(/\s+/g, '')}_${i}`,
          description: `关于 ${groupNames[i % groupNames.length]} 的讨论和资源分享`,
          member_count: memberCount,
          message_count: Math.floor(memberCount * (Math.random() * 10 + 1)),
          photo: { small_file_id: `mock_photo_${i}_small` },
          last_message_date: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 7),
          _meta: { source: 'mock', query, type: 'group' },
        });
      } else {
        // 返回用户数据
        results.push({
          id: String(Math.floor(Math.random() * 9000000000) + 1000000000),
          user_id: Math.floor(Math.random() * 9000000000) + 1000000000,
          first_name: firstNames[i],
          last_name: lastNames[i],
          username: usernames[i],
          bio: bios[i % bios.length],
          language_code: ['zh', 'en', 'ja', 'ko'][Math.floor(Math.random() * 4)],
          is_bot: false,
          _meta: { source: 'mock', query, type: 'user' },
        });
      }
    }

    return results;
  }

  /**
   * 计算 Telegram 群组/频道的活跃度
   */
  private calculateTelegramEngagement(raw: TelegramRawData): number {
    const members = raw.member_count || 0;
    const messages = raw.messages_count || 0;

    if (members === 0) return undefined;

    // 平均每人消息数作为活跃度指标
    const messagesPerMember = messages / members;
    return parseFloat(Math.min(messagesPerMember / 10, 1).toFixed(4));
  }

  /**
   * 从 Telegram 数据中提取标签
   */
  private extractTelegramTags(raw: TelegramRawData): string[] {
    const rawAny = raw as Record<string, unknown>;
    const text =
      `${(rawAny.title as string) || ''} ${(rawAny.description as string) || ''} ${(rawAny.bio as string) || ''} ${(rawAny.first_name as string) || ''} ${(rawAny.last_name as string) || ''}`.toLowerCase();
    const keywords = [
      'AI',
      'web3',
      'crypto',
      'blockchain',
      'developer',
      'startup',
      'investor',
      'trader',
      'entrepreneur',
      'product',
      'design',
      'marketing',
      'data',
      'opensource',
      'saas',
      'fintech',
    ];

    return keywords.filter((kw) => text.includes(kw.toLowerCase()));
  }
}

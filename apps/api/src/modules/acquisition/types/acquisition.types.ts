// ==================== 平台采集选项 ====================
/** 通用采集选项 */
export interface PlatformCollectOptions {
  /** 采集数量上限 */
  limit?: number;
  /** 每页数量 */
  pageSize?: number;
  /** 语言/地区过滤 */
  locale?: string;
  /** 地区 */
  region?: string;
  /** 排序方式 */
  sortBy?: 'followers' | 'engagement' | 'recent' | 'relevance';
  /** 排序顺序 */
  sortOrder?: 'asc' | 'desc';
  /** 是否包含已验证用户 */
  verifiedOnly?: boolean;
  /** 最小粉丝数 */
  minFollowers?: number;
  /** 最大粉丝数 */
  maxFollowers?: number;
  /** 游标/分页令牌（用于增量采集） */
  cursor?: string;
  /** 页码（用于传统分页采集） */
  page?: number;
  /** 扩展平台特定选项 */
  extra?: Record<string, unknown>;
}

// ==================== 原始线索数据（各平台通用字段） ====================
/** 原始线索基础字段 - 所有平台都应提供这些 */
export interface RawLeadBase {
  /** 平台原始 ID */
  id?: string;
  user_id?: string | number;
  uid?: string | number;
  /** 显示名称 */
  name?: string;
  display_name?: string;
  nickname?: string;
  /** 用户名/Handle */
  username?: string;
  handle?: string;
  screen_name?: string;
  unique_id?: string;
  short_id?: string;
  douyin_id?: string;
  /** 个人简介/描述 */
  description?: string;
  bio?: string;
  desc?: string;
  signature?: string;
  introduction?: string;
  /** 粉丝数 */
  followers_count?: number;
  follower_count?: number;
  fans_count?: number;
  follower_count_static?: number;
  /** 关注数 */
  following_count?: number;
  follow_count?: number;
  /** 内容数量 */
  tweet_count?: number;
  tweets_count?: number;
  statuses_count?: number;
  post_count?: number;
  aweme_count?: number;
  video_count?: number;
  works_count?: number;
  /** 头像 URL */
  avatar_url?: string;
  profile_image_url?: string;
  avatar_thumb?: { url_list?: string[] };
  avatar_medium?: { url_list?: string[] };
  /** 主页 URL */
  url?: string;
  profile_url?: string;
  schema_url?: string;
  share_info?: { share_url?: string };
  /** 验证状态 */
  verified?: boolean;
  verification_type?: number | string;
  /** 位置信息 */
  location?: string;
  category?: string;
  /** 最后活跃时间 */
  last_tweet_at?: string;
  latest_status_time?: string;
  modify_time?: number;
  created_at?: string | Date;
  /** 元数据 */
  _meta?: { source: string; query?: string; [key: string]: unknown };
}

/** Twitter 特有原始数据字段 */
export interface TwitterRawData extends RawLeadBase {
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
    listed_count?: number;
  };
  entities?: {
    description?: { urls?: Array<{ display_url?: string }> };
  };
}

/** YouTube 特有原始数据字段 */
export interface YoutubeRawData extends RawLeadBase {
  statistics?: {
    subscriberCount?: string | number;
    videoCount?: string | number;
    viewCount?: string | number;
  };
  snippet?: {
    title?: string;
    description?: string;
    customUrl?: string;
    publishedAt?: string;
    thumbnails?: {
      default?: { url?: string };
      medium?: { url?: string };
      high?: { url?: string };
      [key: string]: unknown;
    };
  };
}

/** 抖音特有原始数据字段 */
export interface DouyinRawData extends RawLeadBase {
  total_favorited?: number;
  link_item?: Array<{ link?: string; type?: string }>;
  contact_info?: { email?: string; phone?: string; website?: string };
}

/** 小红书特有原始数据字段 */
export interface XiaohongshuRawData extends RawLeadBase {
  likes_count?: number;
  notes_count?: number;
  ip_location?: string;
  interaction_data?: unknown;
}

/** Telegram 特有原始数据字段 */
export interface TelegramRawData extends RawLeadBase {
  member_count?: number;
  messages_count?: number;
  channel_type?: 'channel' | 'supergroup' | 'group';
}

/** 联合类型：所有平台的原始数据 */
export type RawLead = (
  | TwitterRawData
  | YoutubeRawData
  | DouyinRawData
  | XiaohongshuRawData
  | TelegramRawData
) &
  Record<string, unknown>;

// ==================== 标准化后的线索数据 ====================
export interface ContactInfo {
  email?: string;
  phone?: string;
  website?: string;
}

/** 标准化后的线索数据（保持现有结构不变） */
export interface NormalizedLead {
  id: string;
  platform: 'twitter' | 'youtube' | 'telegram' | 'douyin' | 'xiaohongshu';
  displayName: string;
  username?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  engagementRate?: number;
  avatarUrl?: string;
  profileUrl?: string;
  lastPostAt?: Date;
  tags?: string[];
  contactInfo?: ContactInfo;
  rawJson: string;
  collectedAt: Date;
  score?: number;
}

// ==================== 采集结果 ====================
export interface CollectResult<T = RawLead> {
  success: boolean;
  data: T[];
  total: number;
  platform: string;
  query: string;
  collectedAt: Date;
  error?: string;
  nextCursor?: string;
}

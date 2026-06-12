import { PlatformCollectOptions, RawLead, NormalizedLead } from '../types/acquisition.types';

/**
 * 平台适配器接口
 *
 * 所有平台适配器必须实现此接口，确保统一的数据采集和标准化行为
 */
export interface PlatformAdapter {
  /** 平台名称标识 */
  readonly platformName: string;

  /**
   * 从平台获取原始线索数据
   * @param query 搜索查询条件
   * @param options 可选参数（平台特定）
   * @returns 原始线索数据数组
   */
  fetchLeads(query: string, options?: PlatformCollectOptions): Promise<RawLead[]>;

  /**
   * 将原始数据标准化为统一的 NormalizedLead 格式
   * @param rawLeads 原始数据数组
   * @returns 标准化后的线索数据数组
   */
  normalizeData(rawLeads: RawLead[]): Promise<NormalizedLead[]>;
}

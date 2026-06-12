import { Injectable, Logger } from '@nestjs/common';
import { BaseAgentStrategy } from './base-agent.strategy';
import { ITaskPayload, ITaskResult, TaskType } from '../types/task.types';
import { IAgentSession } from '../types/agent.types';

/**
 * 支持的分析类型
 */
type AnalysisType = 'kpi_calculation' | 'trend_prediction' | 'anomaly_detection' | 'report';

/**
 * 分析参数接口
 */
interface AnalysisParams {
  /** 分析类型 */
  analysisType: AnalysisType;
  /** 数据时间范围起始 */
  dateFrom?: string;
  /** 数据时间范围结束 */
  dateTo?: string;
  /** 数据筛选条件 */
  filters?: Record<string, unknown>;
  /** 分析维度/指标列表 */
  dimensions?: string[];
  /** 对比基准周期（用于趋势分析） */
  compareWithPrevious?: boolean;
  /** 自定义分析目标 */
  customGoal?: string;
}

/**
 * KPI 计算结果项
 */
interface KpiMetric {
  name: string;
  value: number;
  unit: string;
  changePercent: number;
  changeDirection: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
}

/**
 * 趋势预测数据点
 */
interface TrendPoint {
  period: string;
  actual: number;
  predicted: number;
  confidence: number;
}

/**
 * 异常检测结果
 */
interface AnomalyItem {
  timestamp: string;
  metric: string;
  actualValue: number;
  expectedValue: number;
  deviationPercent: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  possibleCauses: string[];
}

/**
 * 分析报告章节
 */
interface ReportSection {
  title: string;
  content: string;
  chartType?: 'line' | 'bar' | 'pie' | 'table' | 'heatmap';
  chartData?: unknown;
}

/** 分析类型中文映射 */
const ANALYSIS_TYPE_LABELS: Record<AnalysisType, string> = {
  kpi_calculation: 'KPI 指标计算',
  trend_prediction: '趋势预测',
  anomaly_detection: '异常检测',
  report: '综合报告',
};

/**
 * 数据分析 Agent 策略
 *
 * 负责对多维度数据进行深度分析与洞察挖掘。
 * 支持 KPI 计算、趋势预测、异常检测、综合报告四大分析场景。
 * 工作流程：解析分析类型 → 数据获取 → 分析引擎运算 → 结果可视化建议
 *
 * 当前版本为模拟实现（Mock），Phase 3 将接入真实数据源与分析引擎。
 */
@Injectable()
export class AnalysisAgentStrategy extends BaseAgentStrategy {
  override readonly strategyName = 'analysis-agent';

  override readonly supportedTaskTypes: TaskType[] = [TaskType.ANALYSIS];

  constructor() {
    super();
  }

  /**
   * 执行数据分析任务
   *
   * @param session - Agent 会话
   * @param payload - 任务负载（params 中含 analysisType/dateFrom/dateTo 等）
   * @returns 分析结果（含图表数据建议、关键发现）
   */
  async execute(session: IAgentSession, payload: ITaskPayload): Promise<ITaskResult> {
    const startTime = Date.now();

    this.logger.log(`开始执行数据分析任务 | 会话ID=${session.id}`);

    try {
      // Step 1: 提取并校验分析参数
      const params = this.extractAnalysisParams(payload.params);
      this.logger.log(
        `分析参数: 类型=${ANALYSIS_TYPE_LABELS[params.analysisType]}, 时间范围=[${params.dateFrom || '-'} ~ ${params.dateTo || '-'}]`
      );

      // Step 2: 根据 analysisType 分派到对应分析流程
      let resultData: Record<string, unknown>;

      switch (params.analysisType) {
        case 'kpi_calculation':
          resultData = await this.runKpiCalculation(params);
          break;
        case 'trend_prediction':
          resultData = await this.runTrendPrediction(params);
          break;
        case 'anomaly_detection':
          resultData = await this.runAnomalyDetection(params);
          break;
        case 'report':
          resultData = await this.generateReport(params);
          break;
        default:
          throw new Error(`不支持的分析类型: ${params.analysisType}`);
      }

      // Step 3: 补充通用元数据
      const durationMs = Date.now() - startTime;

      this.logger.log(
        `数据分析完成 | 类型=${ANALYSIS_TYPE_LABELS[params.analysisType]} | 耗时=${durationMs}ms`
      );

      return {
        success: true,
        data: {
          analysisType: params.analysisType,
          analysisTypeLabel: ANALYSIS_TYPE_LABELS[params.analysisType],
          timeRange: {
            from: params.dateFrom,
            to: params.dateTo,
          },
          generatedAt: new Date().toISOString(),
          ...resultData,
        },
        metrics: {
          durationMs,
          itemsProcessed: this.countProcessedItems(resultData),
        },
      };
    } catch (error) {
      return this.onError(error as Error, payload);
    }
  }

  /**
   * 预处理：校验分析任务必需参数
   */
  override async preprocess(payload: ITaskPayload): Promise<ITaskPayload> {
    this.logger.debug('分析策略预处理：参数校验');

    const params = payload.params as Record<string, unknown> | undefined;
    if (!params?.analysisType) {
      throw new Error('分析任务缺少必需参数: params.analysisType');
    }

    const validTypes: AnalysisType[] = [
      'kpi_calculation',
      'trend_prediction',
      'anomaly_detection',
      'report',
    ];
    if (!validTypes.includes(params.analysisType as AnalysisType)) {
      throw new Error(`无效的分析类型: ${params.analysisType}，可选值: ${validTypes.join(', ')}`);
    }

    return payload;
  }

  // ==================== 分析子流程 ====================

  /**
   * KPI 指标计算
   */
  private async runKpiCalculation(params: AnalysisParams): Promise<Record<string, unknown>> {
    this.logger.log('执行 KPI 指标计算...');

    // 模拟 KPI 数据集
    const kpiMetrics: KpiMetric[] = [
      {
        name: '活跃用户数',
        value: 128456,
        unit: '人',
        changePercent: 12.5,
        changeDirection: 'up',
        status: 'good',
      },
      {
        name: '转化率',
        value: 3.82,
        unit: '%',
        changePercent: -0.8,
        changeDirection: 'down',
        status: 'warning',
      },
      {
        name: '平均会话时长',
        value: 248,
        unit: '秒',
        changePercent: 5.3,
        changeDirection: 'up',
        status: 'good',
      },
      {
        name: '获客成本',
        value: 45.6,
        unit: '元',
        changePercent: -15.2,
        changeDirection: 'down',
        status: 'good',
      },
      {
        name: '用户留存率',
        value: 67.3,
        unit: '%',
        changePercent: 2.1,
        changeDirection: 'up',
        status: 'good',
      },
      {
        name: '收入增长率',
        value: 18.7,
        unit: '%',
        changePercent: -3.4,
        changeDirection: 'down',
        status: 'warning',
      },
    ];

    return {
      kpiMetrics,
      summary: {
        totalMetrics: kpiMetrics.length,
        goodCount: kpiMetrics.filter((m) => m.status === 'good').length,
        warningCount: kpiMetrics.filter((m) => m.status === 'warning').length,
        criticalCount: kpiMetrics.filter((m) => m.status === 'critical').length,
        overallHealth: kpiMetrics.some((m) => m.status === 'critical')
          ? 'critical'
          : kpiMetrics.some((m) => m.status === 'warning')
            ? 'attention_needed'
            : 'healthy',
      },
      chartSuggestions: [
        { type: 'bar', title: 'KPI 指标概览', dataKey: 'value' },
        { type: 'indicator', title: '关键指标变化趋势', dataKey: 'changePercent' },
      ],
      keyFindings: [
        '活跃用户数同比增长 12.5%，用户增长势头良好',
        '转化率小幅下降 0.8%，建议优化落地页体验',
        '获客成本降低 15.2%，渠道投放效率显著提升',
        '收入增长率有所放缓，需关注核心转化漏斗',
      ],
    };
  }

  /**
   * 趋势预测分析
   */
  private async runTrendPrediction(params: AnalysisParams): Promise<Record<string, unknown>> {
    this.logger.log('执行趋势预测分析...');

    // 模拟历史数据点和预测数据
    const periods = [
      '1月',
      '2月',
      '3月',
      '4月',
      '5月',
      '6月',
      '7月(预测)',
      '8月(预测)',
      '9月(预测)',
      '10月(预测)',
      '11月(预测)',
      '12月(预测)',
    ];

    const trendData: TrendPoint[] = periods.map((period, idx) => {
      const isPredicted = idx >= 6;
      const baseValue = 10000 + idx * 2500 + this.getRandomInt(-500, 800);
      return {
        period,
        actual: isPredicted ? null : baseValue,
        predicted: isPredicted ? baseValue + this.getRandomInt(1000, 3000) : baseValue,
        confidence: isPredicted ? Math.max(50, 95 - (idx - 6) * 7) : 100,
      };
    });

    return {
      trendData,
      predictionHorizon: '6个月',
      overallTrend: 'upward',
      confidenceLevel: 'medium-high',
      predictions: {
        nextMonthGrowth: '+18.5%',
        quarterEndProjection: 285000,
        yearEndProjection: 420000,
      },
      riskFactors: [
        'Q3 季节性波动可能影响增速',
        '竞品活动可能分流部分用户',
        '政策环境存在不确定性',
      ],
      chartSuggestions: [
        { type: 'line', title: '趋势预测曲线', dataKey: 'predicted', showConfidenceBand: true },
        { type: 'area', title: '增长区间预测', dataKey: 'predicted' },
      ],
      keyFindings: [
        '预计未来 6 个月保持 15-20% 的月均增长态势',
        'Q4 可能出现季节性高峰，建议提前储备资源',
        '预测置信度随时间递减，建议每月滚动修正',
      ],
    };
  }

  /**
   * 异常检测分析
   */
  private async runAnomalyDetection(params: AnalysisParams): Promise<Record<string, unknown>> {
    this.logger.log('执行异常检测分析...');

    // 模拟检测到的异常事件
    const anomalies: AnomalyItem[] = [
      {
        timestamp: '2026-06-10T14:32:00Z',
        metric: 'API 响应时间',
        actualValue: 8500,
        expectedValue: 1200,
        deviationPercent: 608.3,
        severity: 'critical',
        possibleCauses: ['数据库连接池耗尽', '第三方服务超时', '流量突发峰值'],
      },
      {
        timestamp: '2026-06-10T09:15:00Z',
        metric: '注册转化率',
        actualValue: 0.8,
        expectedValue: 3.5,
        deviationPercent: -77.1,
        severity: 'high',
        possibleCauses: ['注册页面加载异常', '短信验证服务故障', '营销渠道质量下降'],
      },
      {
        timestamp: '2026-06-09T22:40:00Z',
        metric: '磁盘使用率',
        actualValue: 92,
        expectedValue: 65,
        deviationPercent: 41.5,
        severity: 'medium',
        possibleCauses: ['日志文件未及时清理', '临时文件堆积', '备份文件过大'],
      },
      {
        timestamp: '2026-06-09T16:05:00Z',
        metric: '支付成功率',
        actualValue: 94.2,
        expectedValue: 98.5,
        deviationPercent: -4.4,
        severity: 'low',
        possibleCauses: ['网关偶发超时', '银行通道波动'],
      },
    ];

    return {
      anomalies: anomalies.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      summary: {
        totalAnomalies: anomalies.length,
        criticalCount: anomalies.filter((a) => a.severity === 'critical').length,
        highCount: anomalies.filter((a) => a.severity === 'high').length,
        mediumCount: anomalies.filter((a) => a.severity === 'medium').length,
        lowCount: anomalies.filter((a) => a.severity === 'low').length,
      },
      alertLevel: anomalies.some((a) => a.severity === 'critical')
        ? 'critical'
        : anomalies.some((a) => a.severity === 'high')
          ? 'warning'
          : 'normal',
      recommendations: [
        '立即排查 API 响应时间异常，检查数据库性能指标',
        '验证注册页面可用性，确认短信服务状态',
        '安排磁盘清理计划，设置存储容量告警阈值',
        '持续监控支付网关稳定性，准备备用通道方案',
      ],
      chartSuggestions: [
        { type: 'scatter', title: '异常分布图', dataKey: 'deviationPercent' },
        { type: 'timeline', title: '异常事件时间线', dataKey: 'timestamp' },
      ],
      keyFindings: [
        '检测到 1 个严重级别异常：API 响应时间飙升 608%',
        '注册转化率骤降 77%，需优先排查',
        '磁盘使用率接近警戒线（92%），建议立即清理',
      ],
    };
  }

  /**
   * 生成综合分析报告
   */
  private async generateReport(params: AnalysisParams): Promise<Record<string, unknown>> {
    this.logger.log('生成综合分析报告...');

    // 组合上述三种分析的精华内容
    const sections: ReportSection[] = [
      {
        title: '执行摘要',
        content:
          '本报告涵盖 KPI 表现、趋势预测与异常检测三个维度的综合分析。整体运营状况良好，但存在若干需要关注的预警信号。',
        chartType: undefined,
      },
      {
        title: 'KPI 核心指标总览',
        content:
          '本期核心 KPI 整体健康度为 83%，较上期提升 5 个百分点。活跃用户与留存率表现亮眼，但转化率与收入增速需重点关注。',
        chartType: 'bar',
        chartData: {
          metrics: ['活跃用户', '转化率', '留存率', '收入增速'],
          values: [88, 72, 85, 68],
        },
      },
      {
        title: '趋势预测',
        content: '基于历史数据建模预测，未来 6 个月将保持稳健增长态势，Q4 有望迎来季节性高峰。',
        chartType: 'line',
        chartData: { periods: ['Q1', 'Q2', 'Q3(预)', 'Q4(预)'], values: [100, 125, 155, 195] },
      },
      {
        title: '异常事件汇总',
        content: '监测期内共发现 4 个异常事件，其中 1 个严重级别、1 个高级别，均已生成处置建议。',
        chartType: 'table',
        chartData: {
          headers: ['时间', '指标', '偏差', '级别'],
          rows: [
            ['06-10 14:32', 'API响应时间', '+608%', '严重'],
            ['06-10 09:15', '注册转化率', '-77%', '高'],
          ],
        },
      },
      {
        title: '行动建议',
        content:
          '1. 优先修复 API 性能问题；2. 排查注册链路；3. 清理磁盘空间；4. 准备 Q4 资源预案。',
        chartType: undefined,
      },
    ];

    return {
      reportTitle: `运营分析报告 - ${params.dateFrom || '本周'} 至 ${params.dateTo || '今日'}`,
      sections,
      metadata: {
        generatedBy: this.strategyName,
        sectionCount: sections.length,
        includesCharts: sections.filter((s) => s.chartType).length,
      },
      chartSuggestions: sections
        .filter((s) => s.chartType)
        .map((s) => ({ type: s.chartType, title: s.title })),
      keyFindings: [
        '整体运营健康度良好（83%），核心指标多数向好',
        'API 性能与注册转化是当前最紧迫的问题',
        '趋势预测显示增长可持续，建议提前布局 Q4',
        '共发现 4 个异常事件，建议按优先级依次处置',
      ],
    };
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 安全提取分析参数
   */
  private extractAnalysisParams(params?: Record<string, unknown>): AnalysisParams {
    const raw = params || {};

    const analysisType = String(raw.analysisType || 'report');
    const validTypes: AnalysisType[] = [
      'kpi_calculation',
      'trend_prediction',
      'anomaly_detection',
      'report',
    ];

    return {
      analysisType: validTypes.includes(analysisType as AnalysisType)
        ? (analysisType as AnalysisType)
        : 'report',
      dateFrom: raw.dateFrom ? String(raw.dateFrom) : undefined,
      dateTo: raw.dateTo ? String(raw.dateTo) : undefined,
      filters:
        typeof raw.filters === 'object' && raw.filters !== null
          ? (raw.filters as Record<string, unknown>)
          : undefined,
      dimensions: Array.isArray(raw.dimensions) ? (raw.dimensions as string[]) : undefined,
      compareWithPrevious: Boolean(raw.compareWithPrevious),
      customGoal: raw.customGoal ? String(raw.customGoal) : undefined,
    };
  }

  /**
   * 估算结果中的处理条目数
   */
  private countProcessedItems(resultData: Record<string, unknown>): number {
    let count = 0;
    for (const value of Object.values(resultData)) {
      if (Array.isArray(value)) {
        count += value.length;
      }
    }
    return count;
  }

  /** 生成指定范围的随机整数 */
  private getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

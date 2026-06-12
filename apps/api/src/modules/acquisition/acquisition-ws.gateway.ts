import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * KPI数据结构
 */
export interface KpiData {
  timestamp: string;
  totalLeads: number;
  newLeadsToday: number;
  avgScore: number;
  byPlatform: Record<string, { leads: number; avgScore: number }>;
  syncStatus: Record<string, { status: string; lastSync: string }>;
}

/**
 * 线索变更事件
 */
export interface LeadChangeEvent {
  type: 'created' | 'updated' | 'score_changed' | 'status_changed';
  leadId: string;
  platform: string;
  data: Partial<KpiData>;
  timestamp: string;
}

/**
 * 同步进度事件
 */
export interface SyncProgressEvent {
  platform: string;
  phase: 'fetching' | 'normalizing' | 'deduplicating' | 'storing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  timestamp: string;
}

/**
 * 告警事件
 */
export interface AlertEvent {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  source: string;
  timestamp: string;
  actionUrl?: string;
}

/** 客户端活动记录 */
interface ClientActivity {
  lastPingAt: number;
  messageCount: number;
  countResetAt: number;
  userId?: string;
}

/**
 * 获客WebSocket网关 — 实时数据推送服务
 *
 * 提供 /acquisition 命名空间下的WebSocket连接，
 * 支持JWT鉴权、房间管理、KPI实时推送、线索变更通知、同步进度监控、告警推送等功能。
 *
 * 房间说明：
 * - acquisition:all        — 全局广播（所有连接）
 * - acquisition:kpi         — KPI看板数据
 * - acquisition:leads:{id}  — 指定活动的线索变更
 */
@WebSocketGateway({
  namespace: '/acquisition',
  cors: { origin: '*' },
  transports: ['websocket'],
})
export class AcquisitionWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AcquisitionWsGateway.name);

  /** 客户端活动追踪 */
  private readonly clientActivity = new Map<string, ClientActivity>();

  /** 心跳超时阈值（毫秒） */
  private static readonly HEARTBEAT_TIMEOUT_MS = 60_000;

  /** 每秒最大消息数限制 */
  private static readonly RATE_LIMIT_PER_SECOND = 30;

  /** KPI推送节流间隔（毫秒） */
  private static readonly KPI_THROTTLE_MS = 5_000;

  /** 上次KPI推送时间 */
  private lastKpiPushTime = 0;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {
    // 启动心跳检测定时器（每30秒检查一次）
    setInterval(() => this.checkHeartbeats(), 30_000);
  }

  // ==================== 连接生命周期 ====================

  /**
   * 客户端连接处理
   *
   * 验证JWT令牌有效性，通过后将客户端加入个人房间和全局房间。
   * 鉴权失败则断开连接。
   */
  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`[${client.id}] 未提供认证令牌，拒绝连接`);
        client.emit('error', { code: 'AUTH_MISSING', message: '缺少认证令牌' });
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET') || 'default-secret',
      });

      const userId = payload.sub || payload.userId;

      // 初始化客户端活动记录
      this.clientActivity.set(client.id, {
        lastPingAt: Date.now(),
        messageCount: 0,
        countResetAt: Date.now(),
        userId,
      });

      // 加入个人房间和全局房间
      await client.join(`user:${userId}`);
      await client.join('acquisition:all');

      this.logger.log(
        `[${client.id}] 用户 ${userId} 已连接 (当前在线: ${(this.server.sockets as any).size || 0})`
      );

      // 发送连接成功确认
      client.emit('connected', {
        userId,
        serverTime: new Date().toISOString(),
        availableRooms: ['acquisition:all', 'acquisition:kpi'],
      });
    } catch (error) {
      this.logger.warn(`[${client.id}] 认证失败`, error instanceof Error ? error.message : error);
      client.emit('error', { code: 'AUTH_INVALID', message: '无效的认证令牌' });
      client.disconnect(true);
    }
  }

  /**
   * 客户端断开处理
   *
   * 清理客户端活动记录，离开所有房间，记录日志。
   */
  handleDisconnect(@ConnectedSocket() client: Socket): void {
    const activity = this.clientActivity.get(client.id);
    if (activity?.userId) {
      this.logger.log(`[${client.id}] 用户 ${activity.userId} 已断开`);
    }

    // 清理活动记录
    this.clientActivity.delete(client.id);
  }

  // ==================== 消息处理器 (@SubscribeMessage) ====================

  /**
   * 加入指定房间
   *
   * 支持加入：acquisition:kpi、acquisition:leads:{campaignId} 等业务房间。
   * 需要验证用户权限。
   */
  @SubscribeMessage('join:room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomName: string }
  ): Promise<{ success: boolean; room: string }> {
    const roomName = body.roomName;

    if (!roomName) {
      return { success: false, room: '' };
    }

    // 权限校验：只允许加入预定义前缀的房间
    const allowedPrefixes = ['acquisition:', 'kpi:', 'leads:'];
    const isAllowed = allowedPrefixes.some((prefix) => roomName.startsWith(prefix));

    if (!isAllowed) {
      this.logger.warn(`[${client.id}] 尝试加入未授权房间: ${roomName}`);
      return { success: false, room: roomName };
    }

    // 速率限制检查
    if (this.isRateLimited(client)) {
      client.emit('rate_limited', { message: '消息频率超限' });
      return { success: false, room: roomName };
    }

    await client.join(roomName);
    this.logger.debug(`[${client.id}] 已加入房间: ${roomName}`);
    return { success: true, room: roomName };
  }

  /**
   * 离开指定房间
   */
  @SubscribeMessage('leave:room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomName: string }
  ): Promise<{ success: boolean; room: string }> {
    const roomName = body.roomName;

    if (!roomName) {
      return { success: false, room: '' };
    }

    // 不允许离开全局房间
    if (roomName === 'acquisition:all') {
      return { success: false, room: roomName };
    }

    if (this.isRateLimited(client)) {
      return { success: false, room: roomName };
    }

    await client.leave(roomName);
    this.logger.debug(`[${client.id}] 已离开房间: ${roomName}`);
    return { success: true, room: roomName };
  }

  /**
   * 心跳Ping
   *
   * 客户端应每30秒发送一次ping以保持连接活跃。
   * 服务端响应pong并更新最后活动时间。
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): { event: string; serverTimestamp: string } {
    const activity = this.clientActivity.get(client.id);
    if (activity) {
      activity.lastPingAt = Date.now();
    }

    return {
      event: 'pong',
      serverTimestamp: new Date().toISOString(),
    };
  }

  /**
   * 订阅KPI更新
   *
   * 注册到KPI推送房间，服务端会以5秒节流频率推送数据。
   */
  @SubscribeMessage('subscribe:kpi')
  async handleSubscribeKpi(@ConnectedSocket() client: Socket): Promise<{ success: boolean }> {
    if (this.isRateLimited(client)) {
      return { success: false };
    }

    await client.join('acquisition:kpi');
    this.logger.debug(`[${client.id}] 已订阅KPI更新`);
    return { success: true };
  }

  /**
   * 订阅线索变更通知
   *
   * 注册接收指定活动的线索创建/更新/评分变化等事件。
   */
  @SubscribeMessage('subscribe:leads')
  async handleSubscribeLeads(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { campaignId: string }
  ): Promise<{ success: boolean; room: string }> {
    if (!body.campaignId || this.isRateLimited(client)) {
      return { success: false, room: '' };
    }

    const roomName = `acquisition:leads:${body.campaignId}`;
    await client.join(roomName);
    this.logger.debug(`[${client.id}] 已订阅线索通知: ${roomName}`);
    return { success: true, room: roomName };
  }

  // ==================== 服务端广播方法 ====================

  /**
   * 广播KPI数据更新
   *
   * 向 acquisition:kpi 房间推送最新KPI数据，节流至5秒一次。
   * 由其他服务（如定时任务、数据同步完成后）调用。
   */
  broadcastKpiUpdate(data: KpiData): void {
    const now = Date.now();

    // 节流控制：距离上次推送不足5秒则跳过
    if (now - this.lastKpiPushTime < AcquisitionWsGateway.KPI_THROTTLE_MS) {
      this.logger.debug('KPI推送被节流');
      return;
    }

    this.lastKpiPushTime = now;
    this.server.to('acquisition:kpi').emit('kpi:update', data);
    this.logger.debug(`已广播KPI更新 (总线索: ${data.totalLeads})`);
  }

  /**
   * 广播线索变更事件
   *
   * 向相关活动房间推送线索变更信息。
   * 同时向全局房间推送精简版事件。
   */
  broadcastLeadChange(event: LeadChangeEvent): void {
    // 推送到指定活动的线索房间
    // 从event.data中提取可能的campaignId
    const campaignRoom = `acquisition:leads:${(event.data as any)?.campaignId || 'global'}`;
    this.server.to(campaignRoom).emit('lead:change', event);

    // 全局房间推送精简摘要
    this.server.to('acquisition:all').emit('lead:summary', {
      type: event.type,
      leadId: event.leadId,
      platform: event.platform,
      timestamp: event.timestamp,
    });
  }

  /**
   * 广播数据同步进度
   *
   * 向所有连接推送平台数据同步的实时进度。
   */
  broadcastSyncProgress(progress: SyncProgressEvent): void {
    this.server.to('acquisition:all').emit('sync:progress', progress);
  }

  /**
   * 广播告警事件
   *
   * 立即推送给所有连接，不经过节流机制。
   * critical级别告警额外标记高优先级。
   */
  broadcastAlert(alert: AlertEvent): void {
    this.server.to('acquisition:all').emit('alert', alert);

    if (alert.severity === 'critical') {
      this.logger.warn(`[CRITICAL ALERT] ${alert.title}: ${alert.message}`);
    }
  }

  /**
   * 向指定用户发送定向消息
   *
   * 通过 user:{userId} 房间实现点对点通信。
   */
  sendToUser(userId: string, event: string, data: any): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 从握手信息中提取JWT Token
   *
   * 支持从 handshake.auth.token 或 query参数中获取。
   */
  private extractToken(client: Socket): string | null {
    // 优先从 auth 对象取 token
    const authToken = (client.handshake.auth as Record<string, any>)?.token;
    if (authToken) return authToken;

    // 其次从 query 参数取
    const queryToken = client.handshake.query.token as string;
    if (queryToken) return queryToken;

    return null;
  }

  /**
   * 速率限制检查
   *
   * 每个客户端每秒最多发送30条消息，超出则返回true表示被限制。
   */
  private isRateLimited(client: Socket): boolean {
    const activity = this.clientActivity.get(client.id);
    if (!activity) return true;

    const now = Date.now();

    // 重置计数窗口（1秒）
    if (now - activity.countResetAt >= 1000) {
      activity.messageCount = 0;
      activity.countResetAt = now;
    }

    activity.messageCount++;

    if (activity.messageCount > AcquisitionWsGateway.RATE_LIMIT_PER_SECOND) {
      this.logger.warn(`[${client.id}] 触发速率限制 (${activity.messageCount}/s)`);
      return true;
    }

    return false;
  }

  /**
   * 心跳检测定时任务
   *
   * 每30秒执行一次，检查所有客户端的最后ping时间。
   * 超过60秒无活动的客户端将被自动断开。
   */
  private checkHeartbeats(): void {
    const now = Date.now();
    const timeout = AcquisitionWsGateway.HEARTBEAT_TIMEOUT_MS;

    for (const [clientId, activity] of this.clientActivity.entries()) {
      if (now - activity.lastPingAt > timeout) {
        this.logger.warn(`[${clientId}] 心跳超时，自动断开`);
        const socket = this.server.sockets.sockets.get(clientId);
        if (socket) {
          socket.emit('heartbeat_timeout', {
            message: '长时间未收到心跳，连接已关闭',
          });
          socket.disconnect(true);
        }
        this.clientActivity.delete(clientId);
      }
    }
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class LiveService {
  constructor(private prisma: PrismaService) {}

  // ==================== 平台配置 CRUD ====================

  async findAllPlatforms(page: number = 1, pageSize: number = 20, type?: string, status?: string) {
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.livePlatform.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { sortOrder: 'asc' } }),
      this.prisma.livePlatform.count({ where }),
    ]);
    // 为每个平台附加 rooms count
    const enriched = await Promise.all(data.map(async (p) => {
      const roomsCount = await this.prisma.liveRoom.count({ where: { platformId: p.id } });
      return { ...p, _count: { rooms: roomsCount } };
    }));
    return { data: enriched, total, page, pageSize };
  }

  async getPlatform(id: number) {
    const platform = await this.prisma.livePlatform.findUnique({ where: { id } });
    if (!platform) return null;
    const [roomsCount, streamsCount, analytics] = await Promise.all([
      this.prisma.liveRoom.count({ where: { platformId: id } }),
      this.prisma.liveStream.count({ where: { platformId: id } }),
      this.prisma.liveAnalytics.findMany({ where: { platformId: id }, orderBy: { date: 'desc' }, take: 7 }),
    ]);
    return { ...platform, _count: { rooms: roomsCount, streams: streamsCount }, recentAnalytics: analytics };
  }

  async createPlatform(data: any) {
    return this.prisma.livePlatform.create({ data });
  }

  async updatePlatform(id: number, data: any) {
    return this.prisma.livePlatform.update({ where: { id }, data });
  }

  async deletePlatform(id: number) {
    const roomCount = await this.prisma.liveRoom.count({ where: { platformId: id } });
    if (roomCount > 0) throw new Error(`该平台下还有 ${roomCount} 个直播间，无法删除`);
    return this.prisma.livePlatform.delete({ where: { id } });
  }

  // ==================== 直播间管理 CRUD ====================

  async findAllRooms(page: number = 1, pageSize: number = 20, platformId?: number, status?: string, category?: string) {
    const where: any = {};
    if (platformId) where.platformId = platformId;
    if (status) where.status = status;
    if (category) where.category = category;
    const [data, total] = await Promise.all([
      this.prisma.liveRoom.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: { platform: { select: { id: true, name: true, displayName: true, icon: true } } },
      }),
      this.prisma.liveRoom.count({ where }),
    ]);
    // 附加统计
    const enriched = await Promise.all(data.map(async (r) => {
      const [streamsCount, commentsCount, schedulesCount] = await Promise.all([
        this.prisma.liveStream.count({ where: { roomId: r.id } }),
        this.prisma.liveComment.count({ where: { roomId: r.id, isDeleted: false } }),
        this.prisma.liveSchedule.count({ where: { roomId: r.id } }),
      ]);
      return { ...r, _count: { streams: streamsCount, comments: commentsCount, schedules: schedulesCount } };
    }));
    return { data: enriched, total, page, pageSize };
  }

  async getRoom(id: number) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id },
      include: {
        platform: { select: { id: true, name: true, displayName: true, icon: true } },
        streams: { take: 10, orderBy: { startedAt: 'desc' } },
        schedules: { orderBy: { plannedStart: 'asc' }, take: 5 },
      },
    });
    if (!room) return null;
    const commentsCount = await this.prisma.liveComment.count({ where: { roomId: id, isDeleted: false } });
    return { ...room, _count: { comments: commentsCount } };
  }

  async createRoom(data: any) {
    return this.prisma.liveRoom.create({
      data: { ...data, status: 'offline', likeCount: 0, commentCount: 0, shareCount: 0, giftAmount: 0 },
    });
  }

  async updateRoom(id: number, data: any) {
    return this.prisma.liveRoom.update({ where: { id }, data });
  }

  async deleteRoom(id: number) {
    return this.prisma.liveRoom.delete({ where: { id } });
  }

  async startLive(roomId: number) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new Error('直播间不存在');
    if (room.status === 'living') throw new Error('该直播间已在直播中');
    const now = new Date();
    const streamId = `stream_${roomId}_${Date.now()}`;
    const [updatedRoom, stream] = await Promise.all([
      this.prisma.liveRoom.update({
        where: { id: roomId },
        data: { status: 'living', startedAt: now },
      }),
      this.prisma.liveStream.create({
        data: {
          roomId, platformId: room.platformId, streamId,
          title: room.title,
          startedAt: now,
          status: 'living',
        },
      }),
    ]);
    return { room: updatedRoom, stream };
  }

  async endLive(roomId: number) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId }, include: { streams: { where: { status: 'living' }, orderBy: { startedAt: 'desc' }, take: 1 } } });
    if (!room || room.status !== 'living') throw new Error('当前没有正在进行的直播');
    const now = new Date();
    const activeStream = room.streams[0];
    if (activeStream) {
      const durationSec = Math.floor((now.getTime() - activeStream.startedAt.getTime()) / 1000);
      await this.prisma.liveStream.update({
        where: { id: activeStream.id },
        data: { endedAt: now, durationSec, status: 'ended' },
      });
    }
    return this.prisma.liveRoom.update({
      where: { id: roomId },
      data: { status: 'replay', endedAt: now },
    });
  }

  async getRoomStats() {
    const [totalRooms, byStatus, byPlatform, todayLiving] = await Promise.all([
      this.prisma.liveRoom.count(),
      this.prisma.liveRoom.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.liveRoom.groupBy({ by: ['platformId'], _count: { id: true } }),
      this.prisma.liveStream.count({ where: { status: 'living', startedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    ]);
    // 获取总观看数
    const totalViewsAgg = await this.prisma.liveRoom.aggregate({ _sum: { maxViewers: true } });
    return {
      totalRooms,
      byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count.id])),
      byPlatform: Object.fromEntries(byPlatform.map(p => [String(p.platformId), p._count.id])),
      todayLiving,
      totalViews: totalViewsAgg._sum.maxViewers || 0,
    };
  }

  // ==================== 直播记录 ====================

  async findAllStreams(page: number = 1, pageSize: number = 20, roomId?: number, platformId?: number, status?: string, dateFrom?: string, dateTo?: string) {
    const where: any = {};
    if (roomId) where.roomId = roomId;
    if (platformId) where.platformId = platformId;
    if (status) where.status = status;
    if (dateFrom || dateTo) where.startedAt = {};
    if (dateFrom) where.startedAt.gte = new Date(dateFrom);
    if (dateTo) where.startedAt.lte = new Date(dateTo);
    const [data, total] = await Promise.all([
      this.prisma.liveStream.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { startedAt: 'desc' },
        include: {
          room: { select: { id: true, title: true, coverUrl: true, anchorName: true } },
          platform: { select: { id: true, name: true, displayName: true } },
        },
      }),
      this.prisma.liveStream.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getStream(id: number) {
    return this.prisma.liveStream.findUnique({
      where: { id },
      include: {
        room: { include: { platform: { select: { id: true, name: true, displayName: true } } } },
        platform: true,
      },
    });
  }

  async getStreamStats(platformId?: number, days: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const where: any = { startedAt: { gte: since } };
    if (platformId) where.platformId = platformId;
    const [totalSessions, streams, viewsAgg, likesAgg, giftsAgg, followersAgg, durationAgg] = await Promise.all([
      this.prisma.liveStream.count({ where }),
      this.prisma.liveStream.findMany({ where, select: { startedAt: true, durationSec: true, totalViews: true, totalLikes: true, totalGifts: true, newFollowers: true, status: true } }),
      this.prisma.liveStream.aggregate({ where, _sum: { totalViews: true } }),
      this.prisma.liveStream.aggregate({ where, _sum: { totalLikes: true } }),
      this.prisma.liveStream.aggregate({ where, _sum: { totalGifts: true } }),
      this.prisma.liveStream.aggregate({ where, _sum: { newFollowers: true } }),
      this.prisma.liveStream.aggregate({ where, _sum: { durationSec: true } }),
    ]);
    // 按日趋势
    const trendMap: Record<string, any> = {};
    for (const s of streams) {
      const day = s.startedAt.toISOString().split('T')[0];
      if (!trendMap[day]) trendMap[day] = { sessions: 0, views: 0, likes: 0, followers: 0, durationMin: 0 };
      trendMap[day].sessions++;
      trendMap[day].views += s.totalViews;
      trendMap[day].likes += s.totalLikes;
      trendMap[day].followers += s.newFollowers;
      trendMap[day].durationMin += Math.floor(s.durationSec / 60);
    }
    return {
      totalSessions,
      totalDurationMin: Math.floor((durationAgg._sum.durationSec || 0) / 60),
      totalViews: viewsAgg._sum.totalViews || 0,
      totalLikes: likesAgg._sum.totalLikes || 0,
      totalRevenue: giftsAgg._sum.totalGifts || 0,
      totalFollowers: followersAgg._sum.newFollowers || 0,
      trend: Object.entries(trendMap).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  // ==================== 排期管理 ====================

  async findAllSchedules(page: number = 1, pageSize: number = 20, roomId?: number, status?: string) {
    const where: any = {};
    if (roomId) where.roomId = roomId;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.liveSchedule.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { plannedStart: 'asc' },
        include: { room: { select: { id: true, title: true, anchorName: true, platform: { select: { displayName: true } } } } },
      }),
      this.prisma.liveSchedule.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async createSchedule(data: any) {
    return this.prisma.liveSchedule.create({ data: { ...data, status: 'scheduled' } });
  }

  async updateSchedule(id: number, data: any) {
    return this.prisma.liveSchedule.update({ where: { id }, data });
  }

  async deleteSchedule(id: number) {
    return this.prisma.liveSchedule.delete({ where: { id } });
  }

  async getSchedulesToday() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    return this.prisma.liveSchedule.findMany({
      where: {
        plannedStart: { gte: todayStart, lte: todayEnd },
        status: { in: ['scheduled', 'started'] },
      },
      include: { room: { select: { id: true, title: true, anchorName: true, coverUrl: true } } },
      orderBy: { plannedStart: 'asc' },
    });
  }

  // ==================== 弹幕评论 ====================

  async findComments(page: number = 1, pageSize: number = 20, roomId?: number, commentType?: string, dateFrom?: string, dateTo?: string) {
    const where: any = { isDeleted: false };
    if (roomId) where.roomId = roomId;
    if (commentType) where.commentType = commentType;
    if (dateFrom || dateTo) where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
    const [data, total] = await Promise.all([
      this.prisma.liveComment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.liveComment.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async deleteComment(id: number) {
    return this.prisma.liveComment.update({ where: { id }, data: { isDeleted: true } });
  }

  async pinComment(id: number) {
    const comment = await this.prisma.liveComment.findUnique({ where: { id } });
    if (!comment) throw new Error('评论不存在');
    return this.prisma.liveComment.update({ where: { id }, data: { isPinned: !comment.isPinned } });
  }

  async getCommentStats(roomId?: number) {
    const where: any = { isDeleted: false };
    if (roomId) where.roomId = roomId;
    const [total, byType, pinnedCount] = await Promise.all([
      this.prisma.liveComment.count({ where }),
      this.prisma.liveComment.groupBy({ where, by: ['commentType'], _count: { id: true } }),
      this.prisma.liveComment.count({ where: { ...where, isPinned: true } }),
    ]);
    return {
      total,
      pinnedCount,
      byType: Object.fromEntries(byType.map(t => [t.commentType, t._count.id])),
    };
  }

  // ==================== 数据看板 ====================

  async getDashboardData() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [todayLiving, allRooms, livingRooms, totalViewsAgg, totalGiftsAgg, activeAnchors, platforms] = await Promise.all([
      this.prisma.liveStream.count({ where: { status: 'living', startedAt: { gte: todayStart } } }),
      this.prisma.liveRoom.count(),
      this.prisma.liveRoom.findMany({ where: { status: 'living' }, select: { id: true, title: true, anchorName: true, maxViewers: true, platform: { select: { displayName: true } } } }),
      this.prisma.liveRoom.aggregate({ _sum: { maxViewers: true } }),
      this.prisma.liveRoom.aggregate({ _sum: { giftAmount: true } }),
      this.prisma.liveRoom.groupBy({ by: ['anchorName'], where: { anchorName: { not: null } }, _count: { id: true } }),
      this.prisma.livePlatform.findMany({ where: { status: 'active' }, select: { id: true, name: true, displayName: true, icon: true } }),
    ]);
    // 各平台今日数据
    const platformData = await Promise.all(platforms.map(async (p) => {
      const rooms = await this.prisma.liveRoom.count({ where: { platformId: p.id } });
      const living = await this.prisma.liveRoom.count({ where: { platformId: p.id, status: 'living' } });
      const todayViews = await this.prisma.liveStream.aggregate({
        where: { platformId: p.id, startedAt: { gte: todayStart } },
        _sum: { totalViews: true, totalLikes: true },
      });
      return { ...p, rooms, living, todayViews: todayViews._sum.totalViews || 0, todayLikes: todayViews._sum.totalLikes || 0 };
    }));
    return {
      todayLiveCount: todayLiving,
      totalRooms: allRooms,
      totalViews: totalViewsAgg._sum.maxViewers || 0,
      totalRevenue: totalGiftsAgg._sum.giftAmount || 0,
      activeAnchors: activeAnchors.length,
      livingRooms,
      platformComparison: platformData,
    };
  }

  async getPlatformComparison(days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const platforms = await this.prisma.livePlatform.findMany({ where: { status: 'active' }, orderBy: { sortOrder: 'asc' } });
    return Promise.all(platforms.map(async (p) => {
      const [rooms, analytics] = await Promise.all([
        this.prisma.liveRoom.count({ where: { platformId: p.id } }),
        this.prisma.liveAnalytics.aggregate({
          where: { platformId: p.id, date: { gte: since } },
          _sum: { totalViews: true, totalLikes: true, totalRevenue: true, totalDurationMin: true, newFollowers: true },
          _avg: { avgViewers: true, peakViewers: true },
        }),
      ]);
      return {
        platform: { id: p.id, name: p.name, displayName: p.displayName, icon: p.icon },
        rooms,
        periodViews: Number(analytics._sum.totalViews || BigInt(0)),
        periodLikes: Number(analytics._sum.totalLikes || BigInt(0)),
        periodRevenue: analytics._sum.totalRevenue || 0,
        periodDurationMin: analytics._sum.totalDurationMin || 0,
        periodFollowers: analytics._sum.newFollowers || 0,
        avgViewers: analytics._avg.avgViewers || 0,
        avgPeakViewers: analytics._avg.peakViewers || 0,
      };
    }));
  }

  async getTrendData(days: number = 7) {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      const [views, likes, followers, revenue, sessions] = await Promise.all([
        this.prisma.liveStream.aggregate({
          where: { startedAt: { gte: dayStart, lte: dayEnd } },
          _sum: { totalViews: true },
        }),
        this.prisma.liveStream.aggregate({
          where: { startedAt: { gte: dayStart, lte: dayEnd } },
          _sum: { totalLikes: true },
        }),
        this.prisma.liveStream.aggregate({
          where: { startedAt: { gte: dayStart, lte: dayEnd } },
          _sum: { newFollowers: true },
        }),
        this.prisma.liveStream.aggregate({
          where: { startedAt: { gte: dayStart, lte: dayEnd } },
          _sum: { totalGifts: true },
        }),
        this.prisma.liveStream.count({
          where: { startedAt: { gte: dayStart, lte: dayEnd } },
        }),
      ]);
      result.push({
        date: d.toISOString().split('T')[0],
        views: Number(views._sum.totalViews || BigInt(0)),
        likes: Number(likes._sum.totalLikes || BigInt(0)),
        followers: followers._sum.newFollowers || 0,
        revenue: parseFloat((revenue._sum.totalGifts || 0).toFixed(2)),
        sessions,
      });
    }
    return result;
  }
}

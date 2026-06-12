import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async stats() {
    const [
      userCount,
      companyCount,
      orderCount,
      videoCount,
      aiAgentCount,
      paymentChannelCount,
      dvcSum,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.company.count(),
      this.prisma.order.count(),
      this.prisma.video.count(),
      this.prisma.aiAgent.count(),
      this.prisma.paymentChannel.count(),
      this.prisma.user.aggregate({ _sum: { dvcBalance: true } }),
      this.prisma.order.aggregate({ where: { status: 'completed' }, _sum: { amount: true } }),
    ]);

    const newUsersToday = await this.prisma.user.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    });
    const pendingKyc = await this.prisma.user.count({ where: { kycStatus: 'pending' } });
    const activeOrders = await this.prisma.order.count({
      where: { status: { in: ['new', 'processing', 'reviewing'] } },
    });
    const totalDvc = dvcSum._sum.dvcBalance || 0;
    const totalRevenueUsd = totalRevenue._sum.amount || 0;

    return {
      kpis: [
        {
          key: 'users',
          label: '注册用户',
          value: userCount,
          change: newUsersToday,
          changeType: 'up' as const,
          suffix: '人',
        },
        {
          key: 'companies',
          label: '注册公司',
          value: companyCount,
          changeType: 'neutral' as const,
          suffix: '家',
        },
        {
          key: 'orders',
          label: '工单总数',
          value: orderCount,
          change: activeOrders,
          changeType: 'up' as const,
          suffix: '单',
        },
        {
          key: 'revenue',
          label: '累计收入',
          value: totalRevenueUsd,
          prefix: '$',
          changeType: 'up' as const,
        },
        { key: 'dvc', label: 'DVC 总流通', value: totalDvc, changeType: 'neutral' as const },
        {
          key: 'videos',
          label: '视频总数',
          value: videoCount,
          changeType: 'neutral' as const,
          suffix: '个',
        },
        {
          key: 'ai_agents',
          label: 'AI 顾问',
          value: aiAgentCount,
          changeType: 'neutral' as const,
          suffix: '位',
        },
        {
          key: 'pending_kyc',
          label: '待审 KYC',
          value: pendingKyc,
          changeType: 'warning' as const,
          suffix: '人',
        },
      ],
    };
  }

  async recentActivities() {
    const [recentUsers, recentOrders, recentPayments, recentVideos] = await Promise.all([
      this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: true },
      }),
      this.prisma.paymentTransaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { channel: true },
      }),
      this.prisma.video.findMany({ orderBy: { publishedAt: 'desc' }, take: 5 }),
    ]);

    const activities = [
      ...recentUsers.map((u) => ({
        type: 'user',
        title: `新用户注册: ${u.name}`,
        time: u.createdAt,
        meta: { id: u.id, kyc: u.kycStatus },
      })),
      ...recentOrders.map((o) => ({
        type: 'order',
        title: `工单 ${o.orderNo}: ${o.title}`,
        time: o.createdAt,
        meta: { id: o.id, status: o.status, user: o.user?.name },
      })),
      ...recentPayments.map((p) => ({
        type: 'payment',
        title: `${p.type === 'incoming' ? '收款' : '付款'} ${p.amount} ${p.currency} via ${p.channelName}`,
        time: p.createdAt,
        meta: { id: p.id, status: p.status },
      })),
      ...recentVideos.map((v) => ({
        type: 'video',
        title: `视频发布: ${v.title}`,
        time: v.publishedAt,
        meta: { id: v.id, views: v.views },
      })),
    ];
    activities.sort((a, b) => b.time.getTime() - a.time.getTime());
    return activities.slice(0, 20);
  }

  async chartData() {
    const days = 7;
    const userData: { date: string; value: number }[] = [];
    const orderData: { date: string; value: number }[] = [];
    const revenueData: { date: string; value: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;

      const [users, orders, revenue] = await Promise.all([
        this.prisma.user.count({ where: { createdAt: { gte: d, lt: next } } }),
        this.prisma.order.count({ where: { createdAt: { gte: d, lt: next } } }),
        this.prisma.order.aggregate({
          where: { createdAt: { gte: d, lt: next }, status: 'completed' },
          _sum: { amount: true },
        }),
      ]);
      userData.push({ date: dateStr, value: users });
      orderData.push({ date: dateStr, value: orders });
      revenueData.push({ date: dateStr, value: revenue._sum.amount || 0 });
    }
    return { userTrend: userData, orderTrend: orderData, revenueTrend: revenueData };
  }
}

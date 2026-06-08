import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async list(query: any) {
    const { page = 1, pageSize = 20, type, read, userId } = query;
    const where: any = {};
    if (type) where.type = type;
    if (read !== undefined) where.read = read === 'true' || read === true;
    if (userId) where.userId = Number(userId);
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({ where, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize), orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async create(data: any) {
    return this.prisma.notification.create({ data });
  }

  async broadcast(data: { title: string; message: string; type?: string; actionUrl?: string }) {
    // 群发:为所有用户创建通知
    const users = await this.prisma.user.findMany({ select: { id: true } });
    const data2 = users.map(u => ({ ...data, type: data.type || 'info', userId: u.id }));
    return this.prisma.notification.createMany({ data: data2 });
  }

  async markRead(id: number) {
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }

  async delete(id: number) {
    return this.prisma.notification.delete({ where: { id } });
  }
}

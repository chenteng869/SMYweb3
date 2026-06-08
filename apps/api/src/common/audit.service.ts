import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Request } from 'express';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(req: Request | any, userId: number | null, action: string, module: string, resource?: string, detail?: any, status = 'success') {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: userId || undefined,
          action,
          module,
          resource,
          method: req?.method,
          path: req?.originalUrl || req?.url,
          ip: req?.ip,
          userAgent: req?.headers?.['user-agent'],
          status,
          detail: detail ? JSON.stringify(detail) : undefined,
        },
      });
    } catch (e) {
      // 审计日志失败不应影响业务
    }
  }
}

export class CrudHelper {
  static paginate(page = 1, pageSize = 20) {
    page = Math.max(1, parseInt(String(page)) || 1);
    pageSize = Math.min(100, Math.max(1, parseInt(String(pageSize)) || 20));
    return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
  }

  static ok(data: any, total?: number, page = 1, pageSize = 20) {
    if (total !== undefined) {
      return { data, total, page, pageSize };
    }
    return data;
  }
}

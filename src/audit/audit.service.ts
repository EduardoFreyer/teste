import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface AuditInput {
  actorUserId: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async register(event: AuditInput) {
    await this.prisma.adminAuditLog.create({
      data: {
        actorUserId: event.actorUserId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        metadata: event.metadata ?? {},
      },
    });
  }
}

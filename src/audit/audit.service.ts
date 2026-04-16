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
  constructor(private readonly prisma: PrismaService) {
    void this.prisma;
  }

  async register(event: AuditInput) {
    void event;
  }
}

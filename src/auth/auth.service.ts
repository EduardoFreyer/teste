import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginInput, RegisterInput } from '../common/schemas/auth.schemas';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async register(input: RegisterInput) {
    const exists = await this.usersService.findByEmail(input.email);
    if (exists) {
      throw new ConflictException('Email já está em uso');
    }

    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const user = await this.usersService.createUser({
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      phone: input.phone,
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    };
  }

  async login(input: LoginInput) {
    const user = await this.usersService.findByEmail(input.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, input.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    await this.auditService.register({
      actorUserId: user.id,
      action: 'AUTH_LOGIN',
      resource: 'USER',
      resourceId: user.id,
    });

    return tokens;
  }

  async refresh(userId: string, refreshToken: string) {
    const activeToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeToken) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const validToken = await argon2.verify(activeToken.tokenHash, refreshToken);
    if (!validToken) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Token reutilizado detectado');
    }

    await this.prisma.refreshToken.update({
      where: { id: activeToken.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(userId: string, email: string, role: string) {
    const accessToken = await this.jwtService.signAsync({ sub: userId, email, role });

    const refreshTokenId = randomUUID();
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, tokenId: refreshTokenId, role, typ: 'refresh' },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '15d'),
      },
    );

    const refreshTokenHash = await argon2.hash(refreshToken, {
      type: argon2.argon2id,
    });

    const refreshDays = this.configService.get<number>('JWT_REFRESH_EXPIRES_DAYS', 15);
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: refreshTokenHash,
        tokenId: refreshTokenId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  verifyRefreshToken(token: string) {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }
}

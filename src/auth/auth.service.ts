import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { LoginInput, RegisterInput } from '../common/schemas/auth.schemas';

type ExpiresIn = NonNullable<JwtSignOptions['expiresIn']>;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
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
      fullName: user.nome,
    };
  }

  async login(input: LoginInput) {
    const user = await this.usersService.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await argon2.verify(user.senha, input.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.tipo);
    await this.auditService.register({
      actorUserId: user.id,
      action: 'AUTH_LOGIN',
      resource: 'USER',
      resourceId: user.id,
    });

    return tokens;
  }

  async refresh(userId: string, refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    if (!payload?.sub || payload.sub !== userId || payload.typ !== 'refresh') {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return this.issueTokens(user.id, user.email, user.tipo);
  }

  async logout(_userId: string) {
    return;
  }

  private async issueTokens(userId: string, email: string, role: string) {
    const accessToken = await this.jwtService.signAsync({ sub: userId, email, role });

    const refreshTokenId = randomUUID();
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, tokenId: refreshTokenId, role, typ: 'refresh' },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.getOrThrow<ExpiresIn>('JWT_REFRESH_EXPIRES_IN'),
      },
    );

    return { accessToken, refreshToken };
  }

  verifyRefreshToken(token: string) {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }
}

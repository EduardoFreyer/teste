import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  loginSchema,
  LoginInput,
  registerSchema,
  RegisterInput,
} from '../common/schemas/auth.schemas';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  register(@Body() body: RegisterInput) {
    return this.authService.register(body);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Body() body: LoginInput, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(body);
    this.setRefreshCookie(res, tokens.refreshToken);

    return { accessToken: tokens.accessToken };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken as string | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token ausente');
    }

    const payload = await this.authService.verifyRefreshToken(refreshToken);
    if (!payload?.sub || payload.typ !== 'refresh') {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const tokens = await this.authService.refresh(payload.sub, refreshToken);
    this.setRefreshCookie(res, tokens.refreshToken);

    return { accessToken: tokens.accessToken };
  }

  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @CurrentUser() user: { sub: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.sub);
    res.clearCookie('refreshToken', {
      path: '/api/auth/refresh',
    });
  }

  private setRefreshCookie(res: Response, token: string) {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const sameSite = this.configService.get<'lax' | 'strict' | 'none'>(
      'JWT_REFRESH_COOKIE_SAMESITE',
      'lax',
    );

    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: isProd,
      sameSite,
      path: '/api/auth/refresh',
      maxAge: this.configService.get<number>('JWT_REFRESH_COOKIE_MAX_AGE_MS', 15 * 24 * 60 * 60 * 1000),
    });
  }
}

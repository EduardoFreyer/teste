import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createUser(input: {
    fullName: string;
    email: string;
    passwordHash: string;
    phone?: string;
  }) {
    return this.prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        passwordHash: input.passwordHash,
        phone: input.phone,
      },
    });
  }
}

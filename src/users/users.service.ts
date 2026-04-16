import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.usuario.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.usuario.findUnique({ where: { id } });
  }

  createUser(input: {
    fullName: string;
    email: string;
    passwordHash: string;
    phone?: string;
  }) {
    return this.prisma.usuario.create({
      data: {
        id: randomUUID(),
        nome: input.fullName,
        email: input.email,
        senha: input.passwordHash,
        atualizadoEm: new Date(),
      },
    });
  }
}

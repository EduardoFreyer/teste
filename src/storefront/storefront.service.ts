import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StorefrontQueryInput } from '../common/schemas/storefront.schemas';

@Injectable()
export class StorefrontService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async listProducts(query: StorefrontQueryInput) {
    const where = {
      isActive: true,
      categoryId: query.categoryId,
      name: query.q ? { contains: query.q, mode: 'insensitive' as const } : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          images: true,
          options: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  async getProduct(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true },
      include: {
        category: true,
        images: true,
        options: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return product;
  }
}

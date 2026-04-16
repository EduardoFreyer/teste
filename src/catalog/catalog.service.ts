import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import {
  AdminListQueryInput,
  CategoryCreateInput,
  CategoryUpdateInput,
  ImageCreateInput,
  ImageUpdateInput,
  OptionCreateInput,
  OptionUpdateInput,
  ProductCreateInput,
  ProductUpdateInput,
} from '../common/schemas/catalog.schemas';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createCategory(adminId: string, input: CategoryCreateInput) {
    try {
      const category = await this.prisma.category.create({
        data: input,
      });

      await this.auditService.register({
        actorUserId: adminId,
        action: 'CATEGORY_CREATE',
        resource: 'CATEGORY',
        resourceId: category.id,
        metadata: { slug: category.slug },
      });

      return category;
    } catch (error) {
      this.handlePrismaError(error, 'Categoria já cadastrada');
    }
  }

  async listCategories(query: AdminListQueryInput) {
    const where: Prisma.CategoryWhereInput = {
      name: query.search
        ? {
            contains: query.search,
            mode: 'insensitive',
          }
        : undefined,
      isActive: query.isActive,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async updateCategory(adminId: string, categoryId: string, input: CategoryUpdateInput) {
    await this.ensureCategoryExists(categoryId);

    try {
      const category = await this.prisma.category.update({
        where: { id: categoryId },
        data: input,
      });

      await this.auditService.register({
        actorUserId: adminId,
        action: 'CATEGORY_UPDATE',
        resource: 'CATEGORY',
        resourceId: categoryId,
        metadata: input,
      });

      return category;
    } catch (error) {
      this.handlePrismaError(error, 'Categoria já cadastrada');
    }
  }

  async updateCategoryStatus(adminId: string, categoryId: string, isActive: boolean) {
    const category = await this.prisma.category.update({
      where: { id: categoryId },
      data: { isActive },
    });

    await this.auditService.register({
      actorUserId: adminId,
      action: 'CATEGORY_STATUS_UPDATE',
      resource: 'CATEGORY',
      resourceId: categoryId,
      metadata: { isActive },
    });

    return category;
  }

  async createProduct(adminId: string, input: ProductCreateInput) {
    await this.ensureCategoriesExist(input.categoryIds);

    try {
      const product = await this.prisma.product.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          priceCents: input.priceCents,
          stockQuantity: input.stockQuantity,
          isActive: input.isActive,
          categories: {
            createMany: {
              data: input.categoryIds.map((categoryId) => ({ categoryId })),
            },
          },
        },
        include: {
          categories: {
            include: { category: true },
          },
        },
      });

      await this.auditService.register({
        actorUserId: adminId,
        action: 'PRODUCT_CREATE',
        resource: 'PRODUCT',
        resourceId: product.id,
        metadata: { categoryIds: input.categoryIds },
      });

      return product;
    } catch (error) {
      this.handlePrismaError(error, 'Produto já cadastrado com este slug');
    }
  }

  async listProducts(query: AdminListQueryInput, categoryId?: string) {
    const where: Prisma.ProductWhereInput = {
      name: query.search
        ? {
            contains: query.search,
            mode: 'insensitive',
          }
        : undefined,
      isActive: query.isActive,
      categories: categoryId ? { some: { categoryId } } : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          categories: { include: { category: true } },
          images: { orderBy: { position: 'asc' } },
          options: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async getProductById(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        categories: { include: { category: true } },
        images: { orderBy: { position: 'asc' } },
        options: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return product;
  }

  async updateProduct(adminId: string, productId: string, input: ProductUpdateInput) {
    await this.ensureProductExists(productId);
    if (input.categoryIds) {
      await this.ensureCategoriesExist(input.categoryIds);
    }

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.product.update({
          where: { id: productId },
          data: {
            name: input.name,
            slug: input.slug,
            description: input.description,
            priceCents: input.priceCents,
            stockQuantity: input.stockQuantity,
            isActive: input.isActive,
          },
        });

        if (input.categoryIds) {
          await tx.productCategory.deleteMany({ where: { productId } });
          await tx.productCategory.createMany({
            data: input.categoryIds.map((categoryId) => ({ productId, categoryId })),
          });
        }

        return updated;
      });

      await this.auditService.register({
        actorUserId: adminId,
        action: 'PRODUCT_UPDATE',
        resource: 'PRODUCT',
        resourceId: productId,
        metadata: input,
      });

      return product;
    } catch (error) {
      this.handlePrismaError(error, 'Falha ao atualizar produto');
    }
  }

  async updateProductStatus(adminId: string, productId: string, isActive: boolean) {
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { isActive },
    });

    await this.auditService.register({
      actorUserId: adminId,
      action: 'PRODUCT_STATUS_UPDATE',
      resource: 'PRODUCT',
      resourceId: productId,
      metadata: { isActive },
    });

    return product;
  }

  async addProductOption(adminId: string, productId: string, input: OptionCreateInput) {
    await this.ensureProductExists(productId);

    const option = await this.prisma.productOption.create({
      data: {
        productId,
        type: input.type,
        label: input.label,
        value: input.value,
        priceDelta: input.priceDelta,
        isActive: input.isActive,
      },
    });

    await this.auditService.register({
      actorUserId: adminId,
      action: 'PRODUCT_OPTION_CREATE',
      resource: 'PRODUCT_OPTION',
      resourceId: option.id,
      metadata: { productId, type: input.type },
    });

    return option;
  }

  async updateProductOption(
    adminId: string,
    productId: string,
    optionId: string,
    input: OptionUpdateInput,
  ) {
    await this.ensureOptionBelongsToProduct(productId, optionId);

    const option = await this.prisma.productOption.update({
      where: { id: optionId },
      data: input,
    });

    await this.auditService.register({
      actorUserId: adminId,
      action: 'PRODUCT_OPTION_UPDATE',
      resource: 'PRODUCT_OPTION',
      resourceId: optionId,
      metadata: input,
    });

    return option;
  }

  async deleteProductOption(adminId: string, productId: string, optionId: string) {
    await this.ensureOptionBelongsToProduct(productId, optionId);

    await this.prisma.productOption.delete({ where: { id: optionId } });

    await this.auditService.register({
      actorUserId: adminId,
      action: 'PRODUCT_OPTION_DELETE',
      resource: 'PRODUCT_OPTION',
      resourceId: optionId,
      metadata: { productId },
    });
  }

  async addProductImage(adminId: string, productId: string, input: ImageCreateInput) {
    await this.ensureProductExists(productId);

    const image = await this.prisma.productImage.create({
      data: {
        productId,
        url: input.url,
        alt: input.alt,
        position: input.position,
      },
    });

    await this.auditService.register({
      actorUserId: adminId,
      action: 'PRODUCT_IMAGE_CREATE',
      resource: 'PRODUCT_IMAGE',
      resourceId: image.id,
      metadata: { productId },
    });

    return image;
  }

  async updateProductImage(
    adminId: string,
    productId: string,
    imageId: string,
    input: ImageUpdateInput,
  ) {
    await this.ensureImageBelongsToProduct(productId, imageId);

    const image = await this.prisma.productImage.update({
      where: { id: imageId },
      data: input,
    });

    await this.auditService.register({
      actorUserId: adminId,
      action: 'PRODUCT_IMAGE_UPDATE',
      resource: 'PRODUCT_IMAGE',
      resourceId: imageId,
      metadata: input,
    });

    return image;
  }

  async deleteProductImage(adminId: string, productId: string, imageId: string) {
    await this.ensureImageBelongsToProduct(productId, imageId);

    await this.prisma.productImage.delete({ where: { id: imageId } });

    await this.auditService.register({
      actorUserId: adminId,
      action: 'PRODUCT_IMAGE_DELETE',
      resource: 'PRODUCT_IMAGE',
      resourceId: imageId,
      metadata: { productId },
    });
  }

  private async ensureCategoriesExist(categoryIds: string[]) {
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true },
    });

    if (categories.length !== categoryIds.length) {
      throw new BadRequestException('Uma ou mais categorias são inválidas');
    }
  }

  private async ensureCategoryExists(categoryId: string) {
    const exists = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!exists) {
      throw new NotFoundException('Categoria não encontrada');
    }
  }

  private async ensureProductExists(productId: string) {
    const exists = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!exists) {
      throw new NotFoundException('Produto não encontrado');
    }
  }

  private async ensureOptionBelongsToProduct(productId: string, optionId: string) {
    const option = await this.prisma.productOption.findUnique({ where: { id: optionId } });

    if (!option || option.productId !== productId) {
      throw new NotFoundException('Opção não encontrada para este produto');
    }
  }

  private async ensureImageBelongsToProduct(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });

    if (!image || image.productId !== productId) {
      throw new NotFoundException('Imagem não encontrada para este produto');
    }
  }

  private handlePrismaError(error: unknown, defaultMessage: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new BadRequestException(defaultMessage);
    }

    throw error;
  }
}

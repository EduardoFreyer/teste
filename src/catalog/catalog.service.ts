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
      const category = await this.prisma.category.create({ data: input });

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
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' } },
            { slug: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.category.count({ where }),
    ]);

    return { items, page: query.page, pageSize: query.pageSize, total };
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

  async createProduct(adminId: string, input: ProductCreateInput) {
    await this.ensureCategoryExists(input.categoryId);

    const product = await this.prisma.product.create({
      data: {
        name: input.name,
        description: input.description,
        basePrice: new Prisma.Decimal(input.basePrice),
        categoryId: input.categoryId,
        isActive: input.isActive,
      },
      include: { category: true },
    });

    await this.auditService.register({
      actorUserId: adminId,
      action: 'PRODUCT_CREATE',
      resource: 'PRODUCT',
      resourceId: product.id,
      metadata: { categoryId: product.categoryId },
    });

    return product;
  }

  async listProducts(query: AdminListQueryInput, categoryId?: string) {
    const where: Prisma.ProductWhereInput = {
      name: query.search
        ? { contains: query.search, mode: 'insensitive' }
        : undefined,
      isActive: query.isActive,
      categoryId,
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

  async getProductById(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
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

  async updateProduct(adminId: string, productId: string, input: ProductUpdateInput) {
    await this.ensureProductExists(productId);
    if (input.categoryId) {
      await this.ensureCategoryExists(input.categoryId);
    }

    const product = await this.prisma.product.update({
      where: { id: productId },
      data: {
        name: input.name,
        description: input.description,
        basePrice:
          input.basePrice !== undefined
            ? new Prisma.Decimal(input.basePrice)
            : undefined,
        categoryId: input.categoryId,
        isActive: input.isActive,
      },
      include: { category: true },
    });

    await this.auditService.register({
      actorUserId: adminId,
      action: 'PRODUCT_UPDATE',
      resource: 'PRODUCT',
      resourceId: productId,
      metadata: input,
    });

    return product;
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
        value: input.value,
        priceDelta: new Prisma.Decimal(input.priceDelta),
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
      data: {
        type: input.type,
        value: input.value,
        priceDelta:
          input.priceDelta !== undefined
            ? new Prisma.Decimal(input.priceDelta)
            : undefined,
      },
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
      data: { url: input.url },
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

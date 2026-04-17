import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { CheckoutCreateOrderInput } from '../common/schemas/checkout.schemas';
import { PrismaService } from '../database/prisma.service';
import { ShippingService } from '../shipping/shipping.service';

interface PersonalizationRules {
  requireName: boolean;
  allowCustomColor: boolean;
  allowCustomFont: boolean;
  allowCustomSeed: boolean;
  allowCustomBow: boolean;
  allowCustomBag: boolean;
  allowCustomTag: boolean;
}

const DEFAULT_RULES: PersonalizationRules = {
  requireName: false,
  allowCustomColor: true,
  allowCustomFont: true,
  allowCustomSeed: true,
  allowCustomBow: true,
  allowCustomBag: true,
  allowCustomTag: true,
};

const PRODUCT_RULES: Record<string, PersonalizationRules> = {};

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shippingService: ShippingService,
    private readonly auditService: AuditService,
  ) {}

  async createOrder(userId: string, input: CheckoutCreateOrderInput) {
    const address = await this.prisma.address.findFirst({
      where: { id: input.addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Endereço não encontrado');
    }

    const productIds = [...new Set(input.items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    const productMap = new Map(products.map((product) => [product.id, product]));

    const problematicItems: Array<{ productId: string; reason: string }> = [];
    const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

    let subtotal = new Prisma.Decimal(0);

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        problematicItems.push({
          productId: item.productId,
          reason: 'Produto inválido, inativo ou indisponível',
        });
        continue;
      }

      const rules = PRODUCT_RULES[item.productId] ?? DEFAULT_RULES;
      const personalization = this.validateAndNormalizePersonalization(
        item.personalization,
        rules,
        item.productId,
        problematicItems,
      );

      const optionIds = item.optionIds ?? [];
      const options = optionIds.length
        ? await this.prisma.productOption.findMany({
            where: {
              id: { in: optionIds },
              productId: item.productId,
            },
          })
        : [];

      if (options.length !== optionIds.length) {
        problematicItems.push({
          productId: item.productId,
          reason: 'Uma ou mais opções enviadas são inválidas para o produto',
        });
        continue;
      }

      const optionsDelta = options.reduce(
        (acc, current) => acc.plus(current.priceDelta),
        new Prisma.Decimal(0),
      );

      const unitPrice = product.basePrice.plus(optionsDelta);
      subtotal = subtotal.plus(unitPrice.mul(item.quantity));

      orderItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        personalizedName: personalization.personalizedName,
        customColor: personalization.customColor,
        customFont: personalization.customFont,
        customSeed: personalization.customSeed,
        customBow: personalization.customBow,
        customBag: personalization.customBag,
        customTag: personalization.customTag,
      });
    }

    if (problematicItems.length > 0) {
      throw new BadRequestException({
        message: 'Carrinho contém itens inválidos',
        items: problematicItems,
      });
    }

    const shippingCostString = await this.shippingService.getShippingCost({
      destinationZipCode: address.zipCode,
      itemsCount: input.items.length,
      subtotal: subtotal.toFixed(2),
      method: input.shippingMethod,
    });

    const shippingCost = new Prisma.Decimal(shippingCostString);
    const total = subtotal.plus(shippingCost);

    const order = await this.prisma.order.create({
      data: {
        userId,
        status: 'PENDENTE',
        total,
        shippingCost,
        shippingMethod: input.shippingMethod,
        paymentMethod: input.paymentMethod,
        items: {
          createMany: {
            data: orderItemsData,
          },
        },
      },
      include: {
        items: true,
      },
    });

    await this.auditService.register({
      actorUserId: userId,
      action: 'ORDER_CREATE',
      resource: 'ORDER',
      resourceId: order.id,
      metadata: {
        total: total.toFixed(2),
        shippingMethod: input.shippingMethod,
      },
    });

    return order;
  }

  private validateAndNormalizePersonalization(
    personalization: CheckoutCreateOrderInput['items'][number]['personalization'],
    rules: PersonalizationRules,
    productId: string,
    problematicItems: Array<{ productId: string; reason: string }>,
  ) {
    const input = personalization ?? {};
    const normalized = {
      personalizedName: input.personalizedName?.trim(),
      customColor: input.customColor?.trim(),
      customFont: input.customFont?.trim(),
      customSeed: input.customSeed?.trim(),
      customBow: input.customBow?.trim(),
      customBag: input.customBag?.trim(),
      customTag: input.customTag?.trim(),
    };

    if (rules.requireName && !normalized.personalizedName) {
      problematicItems.push({
        productId,
        reason: 'nomePersonalizado é obrigatório para este produto',
      });
    }

    if (!rules.allowCustomColor && normalized.customColor) {
      problematicItems.push({ productId, reason: 'corPersonalizada não permitida para este produto' });
    }

    if (!rules.allowCustomFont && normalized.customFont) {
      problematicItems.push({ productId, reason: 'fontePersonalizada não permitida para este produto' });
    }

    if (!rules.allowCustomSeed && normalized.customSeed) {
      problematicItems.push({ productId, reason: 'sementePersonalizada não permitida para este produto' });
    }

    if (!rules.allowCustomBow && normalized.customBow) {
      problematicItems.push({ productId, reason: 'lacoPersonalizado não permitido para este produto' });
    }

    if (!rules.allowCustomBag && normalized.customBag) {
      problematicItems.push({ productId, reason: 'saquinhoPersonalizado não permitido para este produto' });
    }

    if (!rules.allowCustomTag && normalized.customTag) {
      problematicItems.push({ productId, reason: 'tagPersonalizada não permitida para este produto' });
    }

    return normalized;
  }
}

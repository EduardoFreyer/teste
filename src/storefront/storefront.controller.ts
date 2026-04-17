import { Controller, Get, Param, Query, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  storefrontQuerySchema,
  StorefrontQueryInput,
} from '../common/schemas/storefront.schemas';
import { StorefrontService } from './storefront.service';

@Controller('store')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get('categories')
  categories() {
    return this.storefrontService.listCategories();
  }

  @Get('products')
  @UsePipes(new ZodValidationPipe(storefrontQuerySchema))
  products(@Query() query: StorefrontQueryInput) {
    return this.storefrontService.listProducts(query);
  }

  @Get('products/:id')
  product(@Param('id') id: string) {
    return this.storefrontService.getProduct(id);
  }
}

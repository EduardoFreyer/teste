import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  Delete,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  adminListQuerySchema,
  AdminListQueryInput,
  categoryCreateSchema,
  CategoryCreateInput,
  categoryUpdateSchema,
  CategoryUpdateInput,
  imageCreateSchema,
  ImageCreateInput,
  imageUpdateSchema,
  ImageUpdateInput,
  optionCreateSchema,
  OptionCreateInput,
  optionUpdateSchema,
  OptionUpdateInput,
  productCreateSchema,
  productStatusSchema,
  ProductCreateInput,
  productUpdateSchema,
  ProductUpdateInput,
} from '../common/schemas/catalog.schemas';
import { CatalogService } from './catalog.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post('categories')
  @UsePipes(new ZodValidationPipe(categoryCreateSchema))
  createCategory(
    @CurrentUser() user: { sub: string },
    @Body() body: CategoryCreateInput,
  ) {
    return this.catalogService.createCategory(user.sub, body);
  }

  @Get('categories')
  @UsePipes(new ZodValidationPipe(adminListQuerySchema))
  listCategories(@Query() query: AdminListQueryInput) {
    return this.catalogService.listCategories(query);
  }

  @Patch('categories/:id')
  @UsePipes(new ZodValidationPipe(categoryUpdateSchema))
  updateCategory(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() body: CategoryUpdateInput,
  ) {
    return this.catalogService.updateCategory(user.sub, id, body);
  }


  @Post('products')
  @UsePipes(new ZodValidationPipe(productCreateSchema))
  createProduct(
    @CurrentUser() user: { sub: string },
    @Body() body: ProductCreateInput,
  ) {
    return this.catalogService.createProduct(user.sub, body);
  }

  @Get('products')
  @UsePipes(new ZodValidationPipe(adminListQuerySchema))
  listProducts(
    @Query() query: AdminListQueryInput,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.catalogService.listProducts(query, categoryId);
  }

  @Get('products/:id')
  getProduct(@Param('id') id: string) {
    return this.catalogService.getProductById(id);
  }

  @Patch('products/:id')
  @UsePipes(new ZodValidationPipe(productUpdateSchema))
  updateProduct(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() body: ProductUpdateInput,
  ) {
    return this.catalogService.updateProduct(user.sub, id, body);
  }

  @Patch('products/:id/status')
  @UsePipes(new ZodValidationPipe(productStatusSchema))
  updateProductStatus(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.catalogService.updateProductStatus(user.sub, id, body.isActive);
  }

  @Post('products/:id/options')
  @UsePipes(new ZodValidationPipe(optionCreateSchema))
  createOption(
    @CurrentUser() user: { sub: string },
    @Param('id') productId: string,
    @Body() body: OptionCreateInput,
  ) {
    return this.catalogService.addProductOption(user.sub, productId, body);
  }

  @Patch('products/:id/options/:optionId')
  @UsePipes(new ZodValidationPipe(optionUpdateSchema))
  updateOption(
    @CurrentUser() user: { sub: string },
    @Param('id') productId: string,
    @Param('optionId') optionId: string,
    @Body() body: OptionUpdateInput,
  ) {
    return this.catalogService.updateProductOption(user.sub, productId, optionId, body);
  }

  @Delete('products/:id/options/:optionId')
  deleteOption(
    @CurrentUser() user: { sub: string },
    @Param('id') productId: string,
    @Param('optionId') optionId: string,
  ) {
    return this.catalogService.deleteProductOption(user.sub, productId, optionId);
  }

  @Post('products/:id/images')
  @UsePipes(new ZodValidationPipe(imageCreateSchema))
  createImage(
    @CurrentUser() user: { sub: string },
    @Param('id') productId: string,
    @Body() body: ImageCreateInput,
  ) {
    return this.catalogService.addProductImage(user.sub, productId, body);
  }

  @Patch('products/:id/images/:imageId')
  @UsePipes(new ZodValidationPipe(imageUpdateSchema))
  updateImage(
    @CurrentUser() user: { sub: string },
    @Param('id') productId: string,
    @Param('imageId') imageId: string,
    @Body() body: ImageUpdateInput,
  ) {
    return this.catalogService.updateProductImage(user.sub, productId, imageId, body);
  }

  @Delete('products/:id/images/:imageId')
  deleteImage(
    @CurrentUser() user: { sub: string },
    @Param('id') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.catalogService.deleteProductImage(user.sub, productId, imageId);
  }
}

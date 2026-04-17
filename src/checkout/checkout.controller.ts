import { Body, Controller, Post, UseGuards, UsePipes } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  checkoutCreateOrderSchema,
  CheckoutCreateOrderInput,
} from '../common/schemas/checkout.schemas';
import { CheckoutService } from './checkout.service';

@Controller('checkout')
@UseGuards(JwtAuthGuard)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('orders')
  @UsePipes(new ZodValidationPipe(checkoutCreateOrderSchema))
  createOrder(
    @CurrentUser() user: { sub: string },
    @Body() body: CheckoutCreateOrderInput,
  ) {
    return this.checkoutService.createOrder(user.sub, body);
  }
}

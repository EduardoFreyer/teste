import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  addressCreateSchema,
  AddressCreateInput,
  addressUpdateSchema,
  AddressUpdateInput,
} from '../common/schemas/checkout.schemas';
import { AccountService } from './account.service';

@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('addresses')
  addresses(@CurrentUser() user: { sub: string }) {
    return this.accountService.listAddresses(user.sub);
  }

  @Post('addresses')
  @UsePipes(new ZodValidationPipe(addressCreateSchema))
  createAddress(
    @CurrentUser() user: { sub: string },
    @Body() body: AddressCreateInput,
  ) {
    return this.accountService.createAddress(user.sub, body);
  }

  @Patch('addresses/:id')
  @UsePipes(new ZodValidationPipe(addressUpdateSchema))
  updateAddress(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() body: AddressUpdateInput,
  ) {
    return this.accountService.updateAddress(user.sub, id, body);
  }

  @Delete('addresses/:id')
  deleteAddress(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.accountService.deleteAddress(user.sub, id);
  }

  @Patch('addresses/:id/default')
  setDefaultAddress(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.accountService.setDefaultAddress(user.sub, id);
  }

  @Get('orders')
  orders(@CurrentUser() user: { sub: string }) {
    return this.accountService.listOrders(user.sub);
  }

  @Get('orders/:id')
  order(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.accountService.getOrderById(user.sub, id);
  }
}

import { Controller, Get, Post } from '@nestjs/common';

@Controller('orders')
export class OrdersController {
  @Get(':id')
  findOne() {}

  @Post()
  create() {}

  @EventPattern('order_created')
  handleCreated() {}
}

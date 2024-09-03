import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderDto } from './create-order.dto';
import { IsEnum, IsString, IsUUID } from "class-validator";
import { OrderStatus } from "@prisma/client";
import { OrderStatusList } from "../enum/order.enum";

export class UpdateOrderStatusDto extends PartialType(CreateOrderDto) {

  @IsString()
  @IsUUID()
  id: string;

  @IsString()
  @IsEnum(OrderStatusList, {
    message: `Possible status values are ${OrderStatusList}`
  })
  status: OrderStatus;
}

import { IsEnum, IsOptional, IsPositive } from "class-validator";
import { Type } from "class-transformer";
import { OrderStatusList } from "../orders/enum/order.enum";
import { OrderStatus } from "@prisma/client";

export class PaginationDto {

  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(OrderStatusList, {
    message: `Possible status values are ${OrderStatusList}`
  })
  status: OrderStatus;

}
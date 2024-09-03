import { HttpStatus, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { CreateOrderDto, UpdateOrderStatusDto } from "./dto";
import { PrismaClient } from "@prisma/client";
import { RpcException } from "@nestjs/microservices";
import { PaginationDto } from "../common/pagination.dto";

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger("OrdersService");

  async onModuleInit() {
    await this.$connect();
    this.logger.log(`Database connected`)
  }

  create(createOrderDto: CreateOrderDto) {
    return this.order.create({
      data: createOrderDto,
    });
  }

  async findAll(paginationDto: PaginationDto) {
    const { page, limit, status } = paginationDto;

    const totalDocs = await this.order.count({
      where: { status },
    });
    const lastPage = Math.ceil(totalDocs / limit);

    return {
      data: await this.order.findMany({
        where: { status },
        skip: (page - 1) * limit,
        take: limit,
      }),
      meta: {
        total: totalDocs,
        page: page,
        lastPage: lastPage,
      }
    }
  }

  async findOne(id: string) {
    const order = await this.order.findFirst({ where: { id } });

    if(!order) {
      throw new RpcException({
        message: `Order with id ${id} not found`,
        status: HttpStatus.NOT_FOUND
      })
    }
    return order;
  }

  async changeOrderStatus(updateOrderStatus: UpdateOrderStatusDto) {

    const order = await this.findOne(updateOrderStatus.id)

    if(order.status === updateOrderStatus.status) {
      return order
    }

    return this.order.update({
      where: { id: updateOrderStatus.id },
      data: {
        status: updateOrderStatus.status,
      }
    })

  }

}

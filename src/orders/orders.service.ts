import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PaginationDto } from '../common/pagination.dto';
import { PRODUCT_SERVICE } from '../config/services';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('OrdersService');

  constructor(
    @Inject(PRODUCT_SERVICE) private readonly productsClient: ClientProxy,
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log(`Database connected`);
  }

  async validateProducts(productIds: number[]) {
    return await firstValueFrom(
      this.productsClient.send({ cmd: 'validate_products' }, productIds),
    );
  }

  async create(createOrderDto: CreateOrderDto) {
    try {
      //1. Confirmar los ids de los productos
      const productIds = createOrderDto.items.map((item) => item.productId);

      const products = await firstValueFrom(
        this.productsClient.send({ cmd: 'validate_products' }, productIds),
      );

      //2. Cálculos de los valores
      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const price = products.find(
          (product) => product.id === orderItem.productId,
        ).price;

        return acc + price * orderItem.quantity;
      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0);

      //3. Crear una transaccion en la base de datos
      const order = await this.order.create({
        data: {
          totalAmount,
          totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((item) => ({
                price: products.find(
                  (product) => product.id === item.productId,
                ).price,
                productId: item.productId,
                quantity: item.quantity,
              })),
            },
          },
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true
            }
          }
        }
      });

      return {
        ...order,
        OrderItem: order.OrderItem.map(( orderItem ) => ({
          ...orderItem,
          name: products.find((product) => product.id === orderItem.productId).name
        }))
      }
    } catch (error) {
      throw new RpcException({
        message: 'Products not found',
        status: HttpStatus.BAD_REQUEST,
      });
    }
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
      },
    };
  }

  async findOne(id: string) {
    const order = await this.order.findFirst({
      where: { id },
      include: {
        OrderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true,
          }
        }
      }
    });

    if (!order) {
      throw new RpcException({
        message: `Order with id ${id} not found`,
        status: HttpStatus.NOT_FOUND,
      });
    }

    const productIds: number[] = order.OrderItem.map(orderItem => orderItem.productId);
    const products = await this.validateProducts(productIds);

    return {
      ...order,
      OrderItem: order.OrderItem.map(( orderItem ) => ({
        ...orderItem,
        name: products.find((product) => product.id === orderItem.productId).name
      }))
    };
  }

  async changeOrderStatus(updateOrderStatus: UpdateOrderStatusDto) {
    const order = await this.findOne(updateOrderStatus.id);

    if (order.status === updateOrderStatus.status) {
      return order;
    }

    return this.order.update({
      where: { id: updateOrderStatus.id },
      data: {
        status: updateOrderStatus.status,
      },
    });
  }
}

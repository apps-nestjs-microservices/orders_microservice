import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ClientsModule, Transport } from "@nestjs/microservices";
import { PRODUCT_SERVICE } from "../config/services";
import { envs } from "../config";

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  imports: [
    ClientsModule.register([
      {
        name: PRODUCT_SERVICE,
        transport: Transport.TCP,
        options: {
          host: envs.products_microservice_host,
          port: envs.products_microservice_port,
        }
      }
    ]),
  ]
})
export class OrdersModule {}

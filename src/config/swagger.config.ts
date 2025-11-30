import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('E-Commerce API')
  .setDescription('E-Commerce REST API Documentation')
  .setVersion('1.0.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    },
    'JWT-auth',
  )
  .addTag('Authentication', 'User authentication and authorization')
  .addTag('Users', 'User profile management')
  .addTag('Catalog', 'Product catalog and categories')
  .addTag('Bundles', 'Product bundles management')
  .addTag('Inventory', 'Inventory tracking and management')
  .addTag('Cart', 'Shopping cart operations')
  .addTag('Orders', 'Order management and tracking')
  .addTag('Shipping', 'Shipping methods and tracking')
  .addTag('Payments', 'Payment processing and refunds')
  .addTag('Reviews', 'Product reviews and ratings')
  .addTag('Coupons', 'Discount coupons and promotions')
  .addTag('Notifications', 'User notifications and preferences')
  .addTag('Reports', 'Analytics and reporting')
  .build();

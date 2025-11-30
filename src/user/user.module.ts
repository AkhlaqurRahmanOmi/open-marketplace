import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { PrismaModule } from 'src/core/config/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
// TEMPORARILY COMMENTED OUT - Will re-enable after NotificationsModule is complete
// import { UserNotificationService } from './notifications/user-notification.service';
// import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthModule),
    // TEMPORARILY COMMENTED OUT - Will re-enable after NotificationsModule is complete
    // forwardRef(() => NotificationsModule),
  ],
  providers: [
    UserService,
    UserRepository,
    // TEMPORARILY COMMENTED OUT - Will re-enable after NotificationsModule is complete
    // UserNotificationService,
  ],
  controllers: [UserController],
  exports: [UserService, UserRepository],
  // TEMPORARILY COMMENTED OUT - Will re-enable after NotificationsModule is complete
  // exports: [UserService, UserRepository, UserNotificationService],
})
export class UserModule {}

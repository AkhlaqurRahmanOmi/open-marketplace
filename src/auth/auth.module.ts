import { forwardRef, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from 'src/user/user.module';
import { HashingProvider } from './providers/hashing.provider';
import { BcryptProvider } from './providers/bcrypt.provider';
import { SignInProvider } from './providers/sign-in.provider';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from './config/jwt.config';
import { JwtModule } from '@nestjs/jwt';
import { GenerateTokenProvider } from './providers/generate-token.provider';
import { RefreshTokenProvider } from './providers/refresh-token.provider';
import { GoogleAuthenticationController } from './social/google-authentication.controller';
import { GoogleAuthenticationService } from './social/google-authentication.service';
import { OtpProvider } from './providers/otp.provider';
import { OtpRepository } from './repositories/otp.repository';
// TEMPORARILY COMMENTED OUT - Will re-enable after NotificationsModule is complete
// import { PasswordResetProvider } from './providers/password-reset.provider';
import { PasswordResetTokenRepository } from './repositories/password-reset-token.repository';
import { OrganizationSwitchProvider } from './providers/organization-switch.provider';
import { PrismaModule } from '../core/config/prisma/prisma.module';
// TEMPORARILY COMMENTED OUT - Will re-enable after NotificationsModule is complete
// import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [AuthController, GoogleAuthenticationController],
  providers: [
    AuthService,
    {
      provide: HashingProvider,
      useClass: BcryptProvider,
    },
    SignInProvider,
    GenerateTokenProvider,
    RefreshTokenProvider,
    GoogleAuthenticationService,
    OtpProvider,
    OtpRepository,
    // TEMPORARILY COMMENTED OUT - Will re-enable after NotificationsModule is complete
    // PasswordResetProvider,
    PasswordResetTokenRepository,
    OrganizationSwitchProvider,
  ],
  imports: [
    forwardRef(() => UserModule),
    // TEMPORARILY COMMENTED OUT - Will re-enable after NotificationsModule is complete
    // forwardRef(() => NotificationsModule),
    PrismaModule,
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync(jwtConfig.asProvider()),
  ],
  exports: [AuthService, HashingProvider, OtpRepository],
})
export class AuthModule {}

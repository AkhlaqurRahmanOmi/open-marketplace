import {
  forwardRef,
  Inject,
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/user/user.service';
import { SignInDto } from './dtos/signin.dto';
import { SignInProvider } from './providers/sign-in.provider';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { RefreshTokenProvider } from './providers/refresh-token.provider';
import { GenerateTokenProvider } from './providers/generate-token.provider';
import { VerifyOtpDto } from './dtos/verify-otp.dto';
import { ResendOtpDto } from './dtos/resend-otp.dto';
import { OtpProvider } from './providers/otp.provider';
import { OtpRepository } from './repositories/otp.repository';
// TEMPORARILY COMMENTED OUT - Will re-enable after NotificationsModule is complete
// import { UserNotificationService } from '../user/notifications/user-notification.service';
import { UserRepository } from '../user/user.repository';
import { UnitOfWorkService } from '../shared/services/unit-of-work.service';
import { HashingProvider } from './providers/hashing.provider';
import { FormattedRole } from '../user/types/user-with-relations.type';

@Injectable()
export class AuthService {
  private readonly resendCooldownSeconds: number;

  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,

    private readonly signInProvider: SignInProvider,

    private readonly refreshTokenProvider: RefreshTokenProvider,

    private readonly otpProvider: OtpProvider,

    private readonly otpRepository: OtpRepository,

    // TEMPORARILY COMMENTED OUT - Will re-enable after NotificationsModule is complete
    // private readonly userNotificationService: UserNotificationService,

    private readonly userRepository: UserRepository,

    private readonly configService: ConfigService,

    private readonly generateTokenProvider: GenerateTokenProvider,

    private readonly unitOfWork: UnitOfWorkService,

    private readonly hashingProvider: HashingProvider,
  ) {
    this.resendCooldownSeconds = this.configService.get<number>(
      'OTP_RESEND_COOLDOWN_SECONDS',
      60,
    );
  }

  /**
   * Register new user with OTP
   */
  public async register(createUserDto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(
      createUserDto.email,
    );

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password before transaction
    const hashedPassword = await this.hashingProvider.hashPassword(
      createUserDto.password,
    );

    // Generate OTP before transaction
    const otpCode = this.otpProvider.generateOTP();
    const expiresAt = this.otpProvider.calculateExpiryTime();

    // Create user and OTP in a transaction
    const user = await this.unitOfWork.transaction(async (tx) => {
      // Create user (isVerified = false)
      const newUser = await tx.user.create({
        data: {
          email: createUserDto.email,
          password: hashedPassword,
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          isVerified: false,
        },
      });

      // Save OTP to database
      await tx.otp.create({
        data: {
          userId: newUser.id,
          code: otpCode,
          type: 'registration',
          expiresAt,
        },
      });

      return newUser;
    });

    // TEMPORARILY COMMENTED OUT - Will re-enable after NotificationsModule is complete
    // Send OTP email (synchronous - critical) - outside transaction
    // const result = await this.userNotificationService.sendOTPEmail(
    //   user.id,
    //   user.email,
    //   otpCode,
    //   this.otpProvider.getConfig().expiryMinutes,
    // );

    // if (!result.success) {
    //   // Rollback: delete all related records in a transaction
    //   await this.unitOfWork.transaction(async (tx) => {
    //     // 1. Delete notifications (has foreign key to user)
    //     await tx.notification.deleteMany({
    //       where: { userId: user.id },
    //     });

    //     // 2. Delete OTP records (has foreign key to user)
    //     await tx.otp.deleteMany({
    //       where: { userId: user.id },
    //     });

    //     // 3. Now safe to delete user
    //     await tx.user.delete({
    //       where: { id: user.id },
    //     });
    //   });

    //   throw new BadRequestException(
    //     'Failed to send verification email. Please try again',
    //   );
    // }

    // TODO: Re-enable email notification after NotificationsModule is complete
    // For now, registration succeeds without email verification
    return {
      message:
        'Registration successful! Please check your email for the verification OTP',
      email: user.email,
      expiresIn: `${this.otpProvider.getConfig().expiryMinutes} minutes`,
    };
  }

  /**
   * Login method
   */
  public async signIn(signInDto: SignInDto) {
    // Check if user is verified
    const user = await this.userService.findOneByEmail(signInDto.email);
    if (user && !user.isVerified) {
      throw new UnauthorizedException(
        'Please verify your email before signing in',
      );
    }

    return await this.signInProvider.signIn(signInDto);
  }

  /**
   * Refresh tokens method
   */
  public async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    return await this.refreshTokenProvider.refreshTokens(refreshTokenDto);
  }

  /**
   * Verify OTP and auto-login
   */
  public async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, otp } = verifyOtpDto;

    // Find user by email
    const user = await this.userService.findOneByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid email or OTP');
    }

    // Check if already verified
    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Find OTP record
    const otpRecord = await this.otpRepository.findLatestByUserIdAndType(
      user.id,
      'registration',
    );

    if (!otpRecord) {
      throw new BadRequestException('OTP not found or expired');
    }

    // Check if expired
    if (this.otpProvider.isExpired(otpRecord.expiresAt)) {
      throw new BadRequestException('OTP has expired. Please request a new one');
    }

    // Check max attempts
    if (this.otpProvider.isMaxAttemptsExceeded(otpRecord.attempts)) {
      throw new BadRequestException(
        'Maximum OTP attempts exceeded. Please request a new one',
      );
    }

    // Verify OTP code
    if (otpRecord.code !== otp) {
      // Increment attempts
      await this.otpRepository.incrementAttempts(otpRecord.id);
      throw new BadRequestException('Invalid OTP');
    }

    // Mark OTP as used
    await this.otpRepository.markAsUsed(otpRecord.id);

    // Mark user as verified
    await this.userRepository.update(user.id, {
      isVerified: true,
      verifiedAt: new Date(),
    });

    // TEMPORARILY COMMENTED OUT - Will re-enable after NotificationsModule is complete
    // Send verification success email (non-critical)
    // await this.userNotificationService.sendAccountVerifiedEmail(
    //   user.id,
    //   user.email,
    //   user.firstName,
    // );

    //add welcome email
      //that's not necessary right now

      // await this.userNotificationService.sendWelcomeEmail(
      //   user.id,
      //   user.email,
      //   user.firstName,
      // );

    // Fetch user with roles for token generation
    const userWithRoles = await this.userRepository.findByIdWithRoles(user.id);

    if (!userWithRoles) {
      throw new BadRequestException('User data not found');
    }

    // Extract roles from userRoles relation
    const roles: FormattedRole[] = userWithRoles.userRoles.map((userRole) => ({
      id: userRole.role.id,
      name: userRole.role.name,
      description: userRole.role.description,
      permissions: userRole.role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
      })),
    }));

    // Auto-login: Generate tokens directly (user is already authenticated via OTP)
    const tokens = await this.generateTokenProvider.generateTokens(userWithRoles || user);

    return {
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      roles,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Resend OTP
   */
  public async resendOtp(resendOtpDto: ResendOtpDto) {
    const { email } = resendOtpDto;

    // Find user by email
    const user = await this.userService.findOneByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if already verified
    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Check resend cooldown
    const recentOtpCount = await this.otpRepository.getRecentOtpCount(
      user.id,
      'registration',
      this.resendCooldownSeconds / 60, // Convert to minutes
    );

    if (recentOtpCount > 0) {
      throw new BadRequestException(
        `Please wait ${this.resendCooldownSeconds} seconds before requesting a new OTP`,
      );
    }

    // Invalidate all previous OTPs
    await this.otpRepository.invalidateAllByUserIdAndType(
      user.id,
      'registration',
    );

    // Generate new OTP
    const otpCode = this.otpProvider.generateOTP();
    const expiresAt = this.otpProvider.calculateExpiryTime();

    // Save OTP to database
    await this.otpRepository.create({
      userId: user.id,
      code: otpCode,
      type: 'registration',
      expiresAt,
    });

    // TEMPORARILY COMMENTED OUT - Will re-enable after NotificationsModule is complete
    // Send OTP email (synchronous - critical)
    // const result = await this.userNotificationService.sendOTPEmail(
    //   user.id,
    //   user.email,
    //   otpCode,
    //   this.otpProvider.getConfig().expiryMinutes,
    // );

    // if (!result.success) {
    //   throw new BadRequestException(
    //     'Failed to send OTP email. Please try again later',
    //   );
    // }

    // TODO: Re-enable email notification after NotificationsModule is complete
    return {
      message: 'OTP sent successfully',
      email: user.email,
      expiresIn: `${this.otpProvider.getConfig().expiryMinutes} minutes`,
    };
  }
}

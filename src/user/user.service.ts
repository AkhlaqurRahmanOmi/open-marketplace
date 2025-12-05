import {
  Injectable,
  ConflictException,
  RequestTimeoutException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { UserRepository } from './user.repository';
import { HashingProvider } from 'src/auth/providers/hashing.provider';
import { UserWithRoles } from './types/user-with-relations.type';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  CacheResult,
  InvalidateCache,
} from '../shared/decorators/cache-result.decorator';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,

    @Inject(forwardRef(() => HashingProvider))
    private readonly hashingProvider: HashingProvider,
  ) {}

  /**
   * Create a new user with hashed password (isVerified = false by default)
   */
  public async createUser(createUserDto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    try {
      // Check if user exists
      const existingUser = await this.userRepository.findByEmail(
        createUserDto.email,
      );

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Hash the password
      const hashedPassword = await this.hashingProvider.hashPassword(
        createUserDto.password,
      );

      // Create the user (isVerified will be false by default from schema)
      const user = await this.userRepository.create({
        email: createUserDto.email,
        password: hashedPassword,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
      });

      return user;
    } catch (error) {
      throw new ConflictException(error, {
        description: 'Unable to create user',
      });
    }
  }

  /**
   * Create a Google user without password
   */
  public async createGoogleUser(googleUserDto: {
    email: string;
    firstName: string;
    lastName: string;
    googleId: string;
  }) {
    try {
      // Check if user exists with email or googleId
      const existingUserByEmail = await this.userRepository.findByEmail(
        googleUserDto.email,
      );
      const existingUserByGoogleId = await this.userRepository.findByGoogleId(
        googleUserDto.googleId,
      );

      if (existingUserByEmail || existingUserByGoogleId) {
        throw new ConflictException('User already exists');
      }

      // Create the user
      const user = await this.userRepository.create({
        email: googleUserDto.email,
        firstName: googleUserDto.firstName,
        lastName: googleUserDto.lastName,
        googleId: googleUserDto.googleId,
        isVerified: true,
        verifiedAt: new Date(),
      });

      return user;
    } catch (error) {
      throw new ConflictException(error, {
        description: 'Unable to create Google user',
      });
    }
  }

  /**
   * Find user by ID
   */
  public async findOne(id: number): Promise<UserWithRoles | null> {
    try {
      return await this.userRepository.findByIdWithRoles(id);
    } catch (error) {
      throw new RequestTimeoutException(
        'Unable to process your request at the moment, please try later',
        {
          description: 'Error connecting to database',
        },
      );
    }
  }

  /**
   * Find user by email
   */
  public async findOneByEmail(email: string) {
    try {
      return await this.userRepository.findByEmail(email);
    } catch (error) {
      throw new RequestTimeoutException(
        'Unable to process your request at the moment, please try later',
        {
          description: 'Error connecting to database',
        },
      );
    }
  }

  /**
   * Find user by Google ID
   */
  public async findOneByGoogleId(googleId: string) {
    try {
      return await this.userRepository.findByGoogleId(googleId);
    } catch (error) {
      throw new RequestTimeoutException(
        'Unable to process your request at the moment, please try later',
        {
          description: 'Error connecting to database',
        },
      );
    }
  }

  /**
   * Find all users with pagination and filters
   */
  public async findAll(filterDto?: {
    page?: number;
    limit?: number;
    search?: string;
    isVerified?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    try {
      const queryOptions: any = {
        pagination: {
          page: filterDto?.page || 1,
          limit: filterDto?.limit || 10,
        },
        filters: {},
      };

      // Add search filter
      if (filterDto?.search) {
        queryOptions.search = {
          query: filterDto.search,
          fields: ['email', 'firstName', 'lastName'],
        };
        queryOptions.filters = {
          OR: [
            { email: { contains: filterDto.search, mode: 'insensitive' } },
            { firstName: { contains: filterDto.search, mode: 'insensitive' } },
            { lastName: { contains: filterDto.search, mode: 'insensitive' } },
          ],
        };
      }

      // Add isVerified filter
      if (filterDto?.isVerified !== undefined) {
        queryOptions.filters.isVerified = filterDto.isVerified;
      }

      // Add sorting
      if (filterDto?.sortBy) {
        queryOptions.sort = {
          field: filterDto.sortBy,
          order: filterDto.sortOrder || 'asc',
        };
      }

      return await this.userRepository.findWithFilters(queryOptions);
    } catch (error) {
      throw new RequestTimeoutException(
        'Unable to process your request at the moment, please try later',
        {
          description: 'Error connecting to database',
        },
      );
    }
  }

  /**
   * Find user with roles and permissions
   * Cached for 2 minutes using RedisJSON (complex nested structure)
   */
  @CacheResult({
    ttl: 120_000, // 2 minutes in ms
    keyPrefix: 'user_roles_permissions',
    keyGenerator: (id: number) => `user_roles_permissions:${id}`,
    dataStructure: 'json', // Use RedisJSON for nested roles/permissions
  })
  public async findUserWithRoles(id: number): Promise<UserWithRoles | null> {
    try {
      return await this.userRepository.findByIdWithRoles(id);
    } catch (error) {
      throw new RequestTimeoutException(
        'Unable to process your request at the moment, please try later',
        {
          description: 'Error connecting to database',
        },
      );
    }
  }

  /**
   * Invalidate user role cache
   */
  public async invalidateUserRoleCache(id: number) {
    const key = `user_roles_permissions:${id}`;
    await this.cache.del(key);
  }

  /**
   * Find user with organizations (for multi-vendor context)
   */
  public async findByIdWithOrganizations(id: number) {
    try {
      return await this.userRepository.findByIdWithOrganizations(id);
    } catch (error) {
      throw new RequestTimeoutException(
        'Unable to process your request at the moment, please try later',
        {
          description: 'Error connecting to database',
        },
      );
    }
  }

  /**
   * Find user with both roles and organizations
   */
  public async findByIdWithRolesAndOrganizations(id: number) {
    try {
      return await this.userRepository.findByIdWithRolesAndOrganizations(id);
    } catch (error) {
      throw new RequestTimeoutException(
        'Unable to process your request at the moment, please try later',
        {
          description: 'Error connecting to database',
        },
      );
    }
  }

  /**
   * Update user information
   */
  public async updateUser(
    id: number,
    updateUserDto: {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
    },
  ) {
    try {
      // Check if user exists
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new ConflictException('User not found');
      }

      // If email is being updated, check if it's already in use
      if (updateUserDto.email && updateUserDto.email !== user.email) {
        const existingUser = await this.userRepository.findByEmail(
          updateUserDto.email,
        );
        if (existingUser) {
          throw new ConflictException('Email is already in use');
        }
      }

      // Hash password if it's being updated
      const updateData: any = { ...updateUserDto };
      if (updateUserDto.password) {
        updateData.password = await this.hashingProvider.hashPassword(
          updateUserDto.password,
        );
      }

      // Update user
      const updatedUser = await this.userRepository.update(id, updateData);
      return updatedUser;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new RequestTimeoutException(
        'Unable to process your request at the moment, please try later',
        {
          description: 'Error updating user',
        },
      );
    }
  }

  /**
   * Delete user
   */
  public async deleteUser(id: number) {
    try {
      // Check if user exists
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new ConflictException('User not found');
      }

      // Delete user
      await this.userRepository.delete(id);

      return { message: 'User deleted successfully' };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new RequestTimeoutException(
        'Unable to process your request at the moment, please try later',
        {
          description: 'Error deleting user',
        },
      );
    }
  }
}

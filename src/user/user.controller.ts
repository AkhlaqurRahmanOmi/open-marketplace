import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserFilterDto } from './dtos/user-filter.dto';
import { Auth } from 'src/auth/decorator/auth.decorator';
import { AuthType } from 'src/auth/enums/auth-type.enum';
import { ActiveUser } from 'src/auth/decorator/active-user.decorator';
import type { ActiveUserData } from 'src/auth/interfaces/active-user-data.interface';
import { Permissions } from 'src/auth/decorator/permissions.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  public async getProfile(@ActiveUser() user: ActiveUserData) {
    return this.userService.findOne(user.sub);
  }

  @Get('all')
  @Permissions('users:view')
  public async getAllUsers(@Query() filterDto: UserFilterDto) {
    return this.userService.findAll(filterDto);
  }

  @Get(':id')
  @Permissions('users:view')
  @UseInterceptors(ClassSerializerInterceptor)
  public async getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Put(':id')
  @Permissions('users:update')
  @UseInterceptors(ClassSerializerInterceptor)
  public async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    // Users can only update their own profile unless they have admin permission
    if (id !== user.sub) {
      throw new Error('Forbidden: You can only update your own profile');
    }
    return this.userService.updateUser(id, updateUserDto);
  }

  @Patch(':id')
  @Permissions('users:update')
  @UseInterceptors(ClassSerializerInterceptor)
  public async patchUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    // Users can only update their own profile unless they have admin permission
    if (id !== user.sub) {
      throw new Error('Forbidden: You can only update your own profile');
    }
    return this.userService.updateUser(id, updateUserDto);
  }

  @Delete(':id')
  @Permissions('users:delete')
  @HttpCode(HttpStatus.OK)
  public async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    // Users can only delete their own account unless they have admin permission
    if (id !== user.sub) {
      throw new Error('Forbidden: You can only delete your own account');
    }
    return this.userService.deleteUser(id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  CreateTemplateDto,
  MarkAsReadDto,
  NotificationFilterDto,
  SendNotificationDto,
  UpdatePreferenceDto,
  UpdateTemplateDto,
} from './dtos';
import { Auth } from '../auth/decorator/auth.decorator';
import { AuthType } from '../auth/enums/auth-type.enum';
import { Permissions } from '../auth/decorator/permissions.decorator';
import { NotificationChannel } from './enums';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}
  // ========================
  // Test Endpoints
  // ========================
  @Post('test')
  @Auth(AuthType.None) // Public endpoint - no auth required
  @HttpCode(HttpStatus.OK)
  async sendTestNotification(@Body() body: { userId: number }) {
    const results = await this.notificationsService.send({
      userId: body.userId,
      event: 'TEST',
      title: 'Test Notification',
      message: `This is a test notification sent at ${new Date().toLocaleTimeString()}`,
      channels: [NotificationChannel.REALTIME],
    });
    return {
      message: 'Test notification sent',
      results,
    };
  }



  // ========================
  // Notification Endpoints
  // ========================

  @Post('send')
  @Permissions('notifications:send')
  @HttpCode(HttpStatus.OK)
  async sendNotification(@Body() dto: SendNotificationDto) {
    const results = await this.notificationsService.send(dto);
    return {
      message: 'Notification dispatched',
      results,
    };
  }

  @Get()
  @Permissions('notifications:view')
  async getNotifications(@Query() filterDto: NotificationFilterDto) {
    return this.notificationsService.getNotifications(filterDto);
  }

  @Get(':id')
  @Permissions('notifications:view')
  async getNotificationById(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.getNotificationById(id);
  }

  @Get('user/:userId')
  @Permissions('notifications:view')
  async getUserNotifications(@Param('userId', ParseIntPipe) userId: number) {
    return this.notificationsService.getUserNotifications(userId);
  }

  @Get('user/:userId/unread')
  @Permissions('notifications:view')
  async getUnreadNotifications(@Param('userId', ParseIntPipe) userId: number) {
    return this.notificationsService.getUnreadNotifications(userId);
  }

  @Get('user/:userId/unread/count')
  @Permissions('notifications:view')
  async getUnreadCount(@Param('userId', ParseIntPipe) userId: number) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Put('mark-as-read')
  @Permissions('notifications:update')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Body() dto: MarkAsReadDto) {
    return this.notificationsService.markAsRead(dto);
  }

  @Put('user/:userId/mark-all-read')
  @Permissions('notifications:update')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Param('userId', ParseIntPipe) userId: number) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @Permissions('notifications:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(@Param('id', ParseIntPipe) id: number) {
    await this.notificationsService.deleteNotification(id);
  }

  @Delete()
  @Permissions('notifications:delete')
  @HttpCode(HttpStatus.OK)
  async deleteMultipleNotifications(@Body() body: { ids: number[] }) {
    return this.notificationsService.deleteMultipleNotifications(body.ids);
  }

  // ========================
  // Template Endpoints
  // ========================

  @Post('templates')
  async createTemplate(@Body() dto: CreateTemplateDto) {
    return this.notificationsService.createTemplate(dto);
  }

  @Get('templates')
  async getTemplates() {
    return this.notificationsService.getTemplates();
  }

  @Get('templates/:id')
  async getTemplateById(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.getTemplateById(id);
  }

  @Get('templates/name/:name')
  async getTemplateByName(@Param('name') name: string) {
    return this.notificationsService.getTemplateByName(name);
  }

  @Put('templates/:id')
  async updateTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.notificationsService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@Param('id', ParseIntPipe) id: number) {
    await this.notificationsService.deleteTemplate(id);
  }

  @Put('templates/:id/toggle')
  @HttpCode(HttpStatus.OK)
  async toggleTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { isActive: boolean },
  ) {
    return this.notificationsService.toggleTemplate(id, body.isActive);
  }

  // ========================
  // Preference Endpoints
  // ========================

  @Put('preferences')
  @HttpCode(HttpStatus.OK)
  async updatePreference(@Body() dto: UpdatePreferenceDto) {
    return this.notificationsService.updatePreference(dto);
  }

  @Get('preferences/user/:userId')
  async getUserPreferences(@Param('userId', ParseIntPipe) userId: number) {
    return this.notificationsService.getUserPreferences(userId);
  }

  @Put('preferences/user/:userId/enable-all')
  @HttpCode(HttpStatus.OK)
  async enableAllNotifications(@Param('userId', ParseIntPipe) userId: number) {
    return this.notificationsService.enableAllNotifications(userId);
  }

  @Put('preferences/user/:userId/disable-all')
  @HttpCode(HttpStatus.OK)
  async disableAllNotifications(@Param('userId', ParseIntPipe) userId: number) {
    return this.notificationsService.disableAllNotifications(userId);
  }
}

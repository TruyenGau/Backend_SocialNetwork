import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Header,
} from '@nestjs/common';

import { NotificationsService } from './notifications.service';
import {
  ResponseMessage,
  SkipCheckPermission,
  User,
} from 'src/auth/decorator/customize';
import { IUser } from 'src/users/users.interface';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ResponseMessage('Get a new notification')
  @Header('Cache-Control', 'no-store') // 🔥 thêm luôn
  @Get()
  getUserNotifications(@User() user: IUser) {
    return this.notificationsService.getUserNotifications(user._id);
  }

  @SkipCheckPermission()
  @Patch(':id/read')
  async markRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }
}

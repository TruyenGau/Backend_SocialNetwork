import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Delete,
  Query,
} from '@nestjs/common';

import { CreateStoryDto } from './dto/create-story.dto';
import {
  User,
  ResponseMessage,
  SkipCheckPermission,
} from 'src/auth/decorator/customize';
import { IUser } from 'src/users/users.interface';
import { StoryService } from './stories.service';

@Controller('stories')
export class StoryController {
  constructor(private readonly storyService: StoryService) {}
  @SkipCheckPermission()
  @ResponseMessage('Create a new story')
  @Post()
  create(@Body() dto: CreateStoryDto, @User() user: IUser) {
    return this.storyService.create(dto, user);
  }
  @SkipCheckPermission()
  @ResponseMessage('Get stories of current user')
  @Get('me')
  findMy(@User() user: IUser) {
    return this.storyService.findMyStories(user);
  }

  @SkipCheckPermission()
  @ResponseMessage('Get stories by userId')
  @Get('user/:id')
  findByUser(@Param('id') userId: string) {
    return this.storyService.findByUserId(userId);
  }

  @SkipCheckPermission()
  @ResponseMessage('Get all stories')
  @Get()
  findAll(@User() user: IUser) {
    return this.storyService.findAllStories(user);
  }
  @SkipCheckPermission()
  @ResponseMessage('Delete story')
  @Delete(':id')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.storyService.remove(id, user);
  }
}

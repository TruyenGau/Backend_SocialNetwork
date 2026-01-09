import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { FollowService } from './follows.service';
import { CreateFollowDto } from './dto/create-follow.dto';
import { UpdateFollowDto } from './dto/update-follow.dto';
import {
  Public,
  SkipCheckPermission,
  User,
} from 'src/auth/decorator/customize';
import { IUser } from 'src/users/users.interface';

@Controller('follow')
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @SkipCheckPermission()
  @Post(':id')
  follow(@Param('id') id: string, @User() user: IUser) {
    return this.followService.follow(user._id, id);
  }

  @SkipCheckPermission()
  @Delete(':id')
  unfollow(@Param('id') id: string, @User() user: IUser) {
    return this.followService.unfollow(user._id, id);
  }

  @Public()
  @SkipCheckPermission()
  @Get('followers/:id')
  followers(@Param('id') id: string) {
    return this.followService.getFollowers(id);
  }
  @Public()
  @SkipCheckPermission()
  @Get('following/:id')
  following(@Param('id') id: string) {
    return this.followService.getFollowing(id);
  }

  @SkipCheckPermission()
  @Get('check/:id')
  checkFollow(@Param('id') id: string, @User() user: IUser) {
    return this.followService.isFollowing(user._id, id);
  }

  @SkipCheckPermission()
  @Get('suggestions')
  suggestions(@User() user: IUser) {
    return this.followService.getSuggestions(user._id);
  }
}

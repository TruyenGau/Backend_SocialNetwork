// src/likes/likes.controller.ts
import { Controller, Param, Post as HttpPost, Delete } from '@nestjs/common';
import { LikesService } from './likes.service';
import { IUser } from 'src/users/users.interface';
import { SkipCheckPermission, User } from 'src/auth/decorator/customize';

@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  // --- Like bài post ---
  @SkipCheckPermission()
  @HttpPost(':postId')
  async like(@Param('postId') postId: string, @User() user: IUser) {
    return this.likesService.likePost(postId, user);
  }

  // --- Unlike bài post ---
  @SkipCheckPermission()
  @Delete(':postId')
  async unlike(@Param('postId') postId: string, @User() user: IUser) {
    return this.likesService.unlikePost(postId, user);
  }

  // --- Toggle (nếu đã like -> unlike, chưa like -> like) ---
  @SkipCheckPermission()
  @HttpPost(':postId/toggle')
  async toggle(@Param('postId') postId: string, @User() user: IUser) {
    return this.likesService.toggleLike(postId, user);
  }
}

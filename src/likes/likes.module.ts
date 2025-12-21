import { Module } from '@nestjs/common';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Post, PostSchema } from 'src/posts/schemas/post.schemas';
import { Like, LikeSchema } from './schemas/like.schemas';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { Action, ActionSchema } from 'src/users/schemas/actions.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Like.name, schema: LikeSchema },
      { name: Action.name, schema: ActionSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [LikesController],
  providers: [LikesService],
})
export class LikesModule {}

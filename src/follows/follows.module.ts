import { Module } from '@nestjs/common';
import { FollowService } from './follows.service';
import { FollowController } from './follows.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { Follow, FollowSchema } from './schemas/follow.schemas';
import { Action, ActionSchema } from 'src/users/schemas/actions.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Follow.name, schema: FollowSchema },
      { name: User.name, schema: UserSchema },
      { name: Action.name, schema: ActionSchema },
    ]),
  ],
  controllers: [FollowController],
  providers: [FollowService],
})
export class FollowsModule {}

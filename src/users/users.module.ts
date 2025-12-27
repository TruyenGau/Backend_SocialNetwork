import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { Role, RoleSchema } from 'src/roles/schema/role.schema';
import { Follow, FollowSchema } from 'src/follows/schemas/follow.schemas';
import { Action, ActionSchema } from './schemas/actions.schema';
import { SpamWarning, SpamWarningSchema } from './schemas/spam-warning.schema';
import { MailService } from './mail.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Follow.name, schema: FollowSchema },
      { name: Action.name, schema: ActionSchema },
      { name: SpamWarning.name, schema: SpamWarningSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, MailService],
  exports: [UsersService], // Export UsersService to be used in other modules
})
export class UsersModule {}

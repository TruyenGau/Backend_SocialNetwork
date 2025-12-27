import { Module } from '@nestjs/common';
import { DatabasesService } from './databases.service';
import { DatabasesController } from './databases.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import {
  Permission,
  PermissionSchema,
} from 'src/permissions/schema/permission.schema';
import { Role, RoleSchema } from 'src/roles/schema/role.schema';
import { UsersService } from 'src/users/users.service';
import { Follow, FollowSchema } from 'src/follows/schemas/follow.schemas';
import { Action, ActionSchema } from 'src/users/schemas/actions.schema';
import {
  SpamWarning,
  SpamWarningSchema,
} from 'src/users/schemas/spam-warning.schema';
import { MailService } from 'src/users/mail.service';

@Module({
  controllers: [DatabasesController],
  providers: [DatabasesService, UsersService, MailService],
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Permission.name, schema: PermissionSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Follow.name, schema: FollowSchema },
      { name: Action.name, schema: ActionSchema },
      { name: SpamWarning.name, schema: SpamWarningSchema },
    ]),
  ],
})
export class DatabasesModule {}

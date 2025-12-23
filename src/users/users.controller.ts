import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  Public,
  ResponseMessage,
  SkipCheckPermission,
  User,
} from 'src/auth/decorator/customize';
import { IUser } from './users.interface';
import { ApiTags } from '@nestjs/swagger';
@ApiTags('user')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ResponseMessage('Create a new user')
  async create(@Body() createUserDto: CreateUserDto, @User() user: IUser) {
    let newUser = await this.usersService.create(createUserDto, user);
    return {
      _id: newUser?._id,
      createdAt: newUser?.createdAt,
    };
  }

  @ResponseMessage('Fetch user with paginate')
  @Get()
  findAll(
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query() qs: string,
  ) {
    return this.usersService.findAll(+currentPage, +limit, qs);
  }

  @Public()
  @ResponseMessage('Fetch user by id')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const foundUser = await this.usersService.findOne(id);
    return foundUser;
  }

  @ResponseMessage('Update a user')
  @Patch()
  async update(@Body() updateUserDto: UpdateUserDto, @User() user: IUser) {
    let updateUser = await this.usersService.update(updateUserDto, user);
    return updateUser;
  }
  @ResponseMessage('Delete a user')
  @Delete(':id')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.usersService.remove(id, user);
  }
  @ResponseMessage('Get today birthday users')
  @SkipCheckPermission()
  @Public()
  @Get('birthday/today')
  async getTodayBirthdays(@Query('userId') userId: string) {
    return this.usersService.getTodayBirthdays(userId);
  }

  @SkipCheckPermission()
  @Public()
  @Get('/ml/users')
  async getAllUserML() {
    return this.usersService.getAllUserML();
  }

  @SkipCheckPermission()
  @Post('/permissions')
  async getUserPermissions(@User() user: IUser) {
    return this.usersService.getUserPermissions(user._id);
  }
  @Public()
  @SkipCheckPermission()
  @Get('/ml/actions')
  async getActionsForML() {
    return this.usersService.getActionsForML();
  }
  @SkipCheckPermission()
  @Get('/all-user/spam-suspected')
  @ResponseMessage('Fetch spam suspected users')
  async getSpamUsers() {
    return this.usersService.getSpamSuspectedUsers();
  }
  @SkipCheckPermission()
  @Patch('/all-user/spam-handle/:userId')
  async handleSpamUser(
    @Param('userId') userId: string,
    @Body()
    body: {
      action: 'WARN' | 'BLOCK' | 'UNBLOCK' | 'RESET';
      message?: string;
    },
    @User() admin: IUser,
  ) {
    return this.usersService.handleSpamUser(
      userId,
      body.action,
      admin,
      body.message,
    );
  }

  @SkipCheckPermission()
  @Get('/me/spam-warnings')
  @ResponseMessage('Fetch my spam warnings')
  async getMySpamWarnings(@User() user: IUser) {
    return this.usersService.getSpamWarningsByUser(user._id);
  }
}

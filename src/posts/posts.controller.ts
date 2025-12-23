import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  Query,
  Put,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import {
  Public,
  ResponseMessage,
  SkipCheckPermission,
  User,
} from 'src/auth/decorator/customize';
import { IUser } from 'src/users/users.interface';
import { CreateBirthdayPostDto } from './dto/create-birthday-post.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @ResponseMessage('Create a new post')
  @Post()
  create(@Body() createPostDto: CreatePostDto, @User() user: IUser) {
    return this.postsService.create(createPostDto, user);
  }

  @ResponseMessage('Fetch list post with paginate')
  @Get()
  findAll(
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query() qs: string,
    @User() user: IUser,
  ): Promise<any> {
    return this.postsService.findAll(+currentPage, +limit, qs, user);
  }

  @SkipCheckPermission()
  @ResponseMessage('Fetch all post')
  @Post('/all')
  findAllPost(
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query() qs: string,
  ): Promise<any> {
    return this.postsService.findAllPost(+currentPage, +limit, qs);
  }
  @SkipCheckPermission()
  @ResponseMessage('Fetch list post with group ')
  @Get('group/:groupId')
  findAllWithGroup(
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query() qs: string,
    @User() user: IUser,
    @Param('groupId') groupId: string,
  ): Promise<any> {
    return this.postsService.findAllWithGroup(
      +currentPage,
      +limit,
      qs,
      user,
      groupId,
    );
  }

  @SkipCheckPermission()
  @ResponseMessage('Fetch list post paginate with userId')
  @Get('/user/:id')
  findAllById(
    @Param('id') userId: string,
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query() qs: string,
    @User() user: IUser,
  ): Promise<any> {
    return this.postsService.findAllById(+currentPage, +limit, qs, userId);
  }

  @ResponseMessage('Fetch a post by id')
  @Get(':id')
  findOne(@Param('id') id: string, @User() user: IUser): Promise<any> {
    return this.postsService.findOne(id, user);
  }

  @ResponseMessage('Update a post by id')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @User() user: IUser,
  ) {
    return this.postsService.update(id, updatePostDto, user);
  }

  @ResponseMessage('Delete a post by id')
  @Delete(':id')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.postsService.remove(id, user);
  }

  @SkipCheckPermission()
  @Post('summary')
  getSummary() {
    return this.postsService.getTotoal();
  }

  @SkipCheckPermission()
  @Post(':postId/save')
  @ResponseMessage('Toggle save post')
  async toggleSavePost(@Param('postId') postId: string, @User() user: IUser) {
    return this.postsService.toggleSavePost(postId, user);
  }
  @SkipCheckPermission()
  @Put('saved')
  @ResponseMessage('Fetch saved posts')
  async getSavedPosts(@User() user: IUser): Promise<any> {
    return this.postsService.getSavedPosts(user);
  }
  @SkipCheckPermission()
  @Patch(':id/approve')
  approvePost(@Param('id') id: string, @User() user: IUser) {
    return this.postsService.approvePost(id, user);
  }
  @SkipCheckPermission()
  @Patch(':id/reject')
  rejectPost(@Param('id') id: string, @User() user: IUser) {
    return this.postsService.rejectPost(id, user);
  }
  @SkipCheckPermission()
  @ResponseMessage('Share post to feed')
  @Post(':id/share')
  sharePost(
    @Param('id') postId: string,
    @Body() body: { content?: string },
    @User() user: IUser,
  ) {
    return this.postsService.sharePost(postId, body.content, user);
  }

  @SkipCheckPermission()
  @Post('birthday')
  @ResponseMessage('Create birthday post')
  createBirthdayPost(@Body() body: CreateBirthdayPostDto, @User() user: IUser) {
    return this.postsService.createBirthdayPost(body, user);
  }

  @ResponseMessage('GLOBAL SEARCH')
  @SkipCheckPermission()
  @Get('global/search')
  @Public()
  globalSearch(@Query('q') q: string) {
    return this.postsService.globalSearch(q);
  }
}

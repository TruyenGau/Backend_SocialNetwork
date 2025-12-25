import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PollsService } from './polls.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { VotePollDto } from './dto/vote-poll.dto';

import {
  Public,
  SkipCheckPermission,
  User,
} from 'src/auth/decorator/customize';
import { IUser } from 'src/users/users.interface';

@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  // =========================
  // CREATE POLL
  // =========================
  @SkipCheckPermission()
  @Post()
  create(@Body() dto: CreatePollDto, @User() user: IUser) {
    return this.pollsService.create(dto, user);
  }

  // =========================
  // VOTE
  // =========================
  @SkipCheckPermission()
  @Post(':id/vote')
  vote(@Param('id') id: string, @Body() dto: VotePollDto, @User() user: IUser) {
    return this.pollsService.vote(id, dto.optionIndex, user);
  }

  // =========================
  // GET POLL DETAIL
  // =========================
  @Public()
  @SkipCheckPermission()
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.pollsService.findById(id);
  }

  // =========================
  // GET POLLS BY COMMUNITY
  // =========================
  @SkipCheckPermission()
  @Get('community/:communityId')
  getByCommunity(@Param('communityId') communityId: string) {
    return this.pollsService.findByCommunity(communityId);
  }
}

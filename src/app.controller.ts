import {
  Controller,
  Get,
  Post,
  Render,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth/auth.service';
import { Public } from './auth/decorator/customize';
import { ApiTags } from '@nestjs/swagger';
// @ApiTags('cats')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private configService: ConfigService,
    private authService: AuthService,
  ) {}
  @Get()
  @Public()
  @Render('home.ejs')
  hello() {
    return 'abc';
  }
}

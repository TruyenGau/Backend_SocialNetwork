import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LoginmediaService } from './loginmedia.service';
import { CreateLoginmediaDto } from './dto/create-loginmedia.dto';
import { UpdateLoginmediaDto } from './dto/update-loginmedia.dto';

@Controller('loginmedia')
export class LoginmediaController {
  constructor(private readonly loginmediaService: LoginmediaService) {}

  @Post()
  create(@Body() createLoginmediaDto: CreateLoginmediaDto) {
    return this.loginmediaService.create(createLoginmediaDto);
  }

  @Get()
  findAll() {
    return this.loginmediaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loginmediaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLoginmediaDto: UpdateLoginmediaDto) {
    return this.loginmediaService.update(+id, updateLoginmediaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.loginmediaService.remove(+id);
  }
}

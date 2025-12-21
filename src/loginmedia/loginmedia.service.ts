import { Injectable } from '@nestjs/common';
import { CreateLoginmediaDto } from './dto/create-loginmedia.dto';
import { UpdateLoginmediaDto } from './dto/update-loginmedia.dto';

@Injectable()
export class LoginmediaService {
  create(createLoginmediaDto: CreateLoginmediaDto) {
    return 'This action adds a new loginmedia';
  }

  findAll() {
    return `This action returns all loginmedia`;
  }

  findOne(id: number) {
    return `This action returns a #${id} loginmedia`;
  }

  update(id: number, updateLoginmediaDto: UpdateLoginmediaDto) {
    return `This action updates a #${id} loginmedia`;
  }

  remove(id: number) {
    return `This action removes a #${id} loginmedia`;
  }
}

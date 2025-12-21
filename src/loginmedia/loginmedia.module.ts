import { Module } from '@nestjs/common';
import { LoginmediaService } from './loginmedia.service';
import { LoginmediaController } from './loginmedia.controller';

@Module({
  controllers: [LoginmediaController],
  providers: [LoginmediaService]
})
export class LoginmediaModule {}

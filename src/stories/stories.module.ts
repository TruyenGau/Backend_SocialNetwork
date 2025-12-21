import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StoryService } from './stories.service';
import { StoryController } from './stories.controller';
import { Story, StorySchema } from './schemas/story.schemas';
import { Follow, FollowSchema } from 'src/follows/schemas/follow.schemas';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Story.name, schema: StorySchema }]),
    MongooseModule.forFeature([{ name: Follow.name, schema: FollowSchema }]),
  ],
  controllers: [StoryController],
  providers: [StoryService],
})
export class StoriesModule {}

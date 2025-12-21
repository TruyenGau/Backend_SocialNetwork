import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateStoryDto } from './dto/create-story.dto';
import { IUser } from 'src/users/users.interface';
import { Story, StoryDocument } from './schemas/story.schemas';
import { Follow, FollowDocument } from 'src/follows/schemas/follow.schemas';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';

@Injectable()
export class StoryService {
  constructor(
    @InjectModel(Story.name) private storyModel: Model<StoryDocument>,
    @InjectModel(Follow.name)
    private followModel: SoftDeleteModel<FollowDocument>,
  ) {}

  // Tạo story mới
  async create(createStoryDto: CreateStoryDto, user: IUser) {
    return await this.storyModel.create({
      userId: user._id,
      image: createStoryDto.image,
    });
  }

  // Lấy tất cả story của người dùng đang login
  async findMyStories(user: IUser) {
    return await this.storyModel
      .find({ userId: user._id })
      .sort({ createdAt: -1 });
  }

  // Lấy tất cả story của tất cả user để hiển thị trên trang Home
  async findAllStories(user: IUser) {
    // 1. Lấy danh sách người tôi đang follow
    const following = await this.followModel
      .find({ follower: user._id })
      .select('following')
      .lean();

    const followingIds = following.map((f) => f.following);

    // 2. Thêm chính tôi vào danh sách
    const storyUserIds = [...followingIds, user._id];

    // 3. Lấy stories của tôi + người tôi follow
    return await this.storyModel
      .find({ userId: { $in: storyUserIds } })
      .sort({ createdAt: -1 })
      .populate('userId', 'name avatar');
  }

  // Lấy story theo userId
  async findByUserId(userId: string) {
    return await this.storyModel.find({ userId }).sort({ createdAt: -1 });
  }

  // Xoá story (nếu cần)
  async remove(id: string, user: IUser) {
    const story = await this.storyModel.findById(id);
    if (!story) throw new NotFoundException('Story not found');

    if (story.userId.toString() !== user._id.toString()) {
      throw new NotFoundException('You cannot delete this story');
    }

    await this.storyModel.deleteOne({ _id: id });
    return { message: 'Story deleted' };
  }
}

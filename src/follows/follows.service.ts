import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Follow } from './schemas/follow.schemas';
import { User } from 'src/users/schemas/user.schema';
import { Model } from 'mongoose';
import axios from 'axios';
import { Action } from 'src/users/schemas/actions.schema';

@Injectable()
export class FollowService {
  constructor(
    @InjectModel(Follow.name) private followModel: Model<Follow>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Action.name) private actionModel: Model<Action>,
  ) {}

  // FOLLOW
  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('Không thể tự follow chính mình');
    }

    const existed = await this.followModel.findOne({
      follower: followerId,
      following: followingId,
    });
    if (existed) {
      throw new BadRequestException('Bạn đã follow người này');
    }

    await this.followModel.create({
      follower: followerId,
      following: followingId,
    });

    // Tăng đếm
    await this.userModel.findByIdAndUpdate(followerId, {
      $inc: { followingCount: 1 },
    });
    await this.userModel.findByIdAndUpdate(followingId, {
      $inc: { followersCount: 1 },
    });

    await this.actionModel.updateOne(
      {
        actorId: followerId,
        targetId: followingId,
        actionType: 'follow',
      },
      {
        $set: { isDeleted: false },
      },
      { upsert: true },
    );
    let check = false;

    // 2. Nếu update thành công → gọi ML server training lại
    try {
      await axios.post('http://36.50.135.249:5000/train');
      check = true;
      console.log('🔥 ML model retrained after user update.');
    } catch (err) {
      console.error('❌ ML training failed:', err.message);
    }
    console.log(check);

    return { message: 'Follow thành công', check: check };
  }

  // UNFOLLOW
  async unfollow(followerId: string, followingId: string) {
    const deleted = await this.followModel.findOneAndDelete({
      follower: followerId,
      following: followingId,
    });

    if (!deleted) return;

    await this.userModel.findByIdAndUpdate(followerId, {
      $inc: { followingCount: -1 },
    });
    await this.userModel.findByIdAndUpdate(followingId, {
      $inc: { followersCount: -1 },
    });
    await this.actionModel.updateOne(
      {
        actorId: followerId,
        targetId: followingId,
        actionType: 'follow',
      },
      {
        $set: { isDeleted: true },
      },
    );
    // 2. Nếu update thành công → gọi ML server training lại
    try {
      await axios.post('http://36.50.135.249:5000/train');
      console.log('🔥 ML model retrained after user update.');
    } catch (err) {
      console.error('❌ ML training failed:', err.message);
    }
    return { message: 'UnFollow thành công' };
  }

  // Lấy danh sách tôi đang follow
  async getFollowing(userId: string) {
    return this.followModel
      .find({ follower: userId })
      .populate('following', 'name avatar online');
  }

  // Lấy danh sách người đang follow tôi
  async getFollowers(userId: string) {
    return this.followModel
      .find({ following: userId })
      .populate('follower', 'name avatar');
  }

  // Kiểm tra 1 người đã follow chưa
  async isFollowing(followerId: string, targetId: string) {
    const check = await this.followModel.findOne({
      follower: followerId,
      following: targetId,
    });
    return {
      isFollowed: !!check,
    };
  }
  async getSuggestions(userId: string, limit = 2) {
    // ================== 1. Gọi ML ==================
    const mlList = await this.getMLRecommendations(userId);

    // ================== 2. Lấy danh sách đang follow ==================
    const following = await this.followModel
      .find({ follower: userId })
      .select('following')
      .lean();

    const followingSet = new Set(following.map((f) => f.following.toString()));

    // ================== 3. Lọc theo business rule ==================
    const selectedIds: string[] = [];

    for (const candidateId of mlList) {
      if (candidateId === userId) continue; // ❌ chính mình
      if (followingSet.has(candidateId)) continue; // ❌ đã follow

      selectedIds.push(candidateId);
      if (selectedIds.length === limit) break;
    }

    // ================== 4. Fallback nếu ML không ra ==================
    if (!selectedIds.length) {
      return this.fallbackSuggestions(userId, limit);
    }

    // ================== 5. Lấy profile + giữ thứ tự ML ==================
    const users = await this.userModel
      .find({ _id: { $in: selectedIds } })
      .select('name avatar')
      .lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    return selectedIds.map((id) => userMap.get(id)).filter(Boolean);
  }

  async getMLRecommendations(userId: string): Promise<string[]> {
    const apiUrl = `http://36.50.135.249:5000/recommend/${userId}`;

    try {
      const res = await axios.get(apiUrl, { timeout: 2000 });
      console.log('🤖 [ML] Raw recommend list:', res.data?.recommend);
      return res.data?.recommend ?? [];
    } catch (e) {
      console.error('ML API Error:', e.message);
      return [];
    }
  }
  private async fallbackSuggestions(userId: string, limit: number) {
    const following = await this.followModel
      .find({ follower: userId })
      .select('following')
      .lean();

    const excludeIds = [
      userId,
      ...following.map((f) => f.following.toString()),
    ];

    return this.userModel
      .find({ _id: { $nin: excludeIds } })
      .limit(limit)
      .select('name avatar')
      .lean();
  }
}

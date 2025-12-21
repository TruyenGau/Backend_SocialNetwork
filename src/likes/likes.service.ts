// src/posts/posts.service.ts (chỉ phần bổ sung)
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { Post, PostDocument } from 'src/posts/schemas/post.schemas';
import { IUser } from 'src/users/users.interface';
import { Like, LikeDocument } from './schemas/like.schemas';
import { NotificationsService } from 'src/notifications/notifications.service';
import { Action } from 'src/users/schemas/actions.schema';
import axios from 'axios';

@Injectable()
export class LikesService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>, // or SoftDeleteModel<PostDocument> tuỳ bạn
    @InjectModel(Like.name) private readonly likeModel: Model<LikeDocument>,
    @InjectModel(Action.name) private actionModel: Model<Action>,

    private notificationsService: NotificationsService,
  ) {}

  // --- Helper ---
  private ensureObjectId(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid id');
  }

  async hasLiked(postId: string, userId: string) {
    return this.likeModel.exists({ postId, userId, isDeleted: false });
  }

  async countLikes(postId: string) {
    return this.likeModel.countDocuments({ postId, isDeleted: false });
  }

  // --- LIKE ---
  async likePost(postId: string, user: IUser) {
    this.ensureObjectId(postId);
    const post = await this.postModel
      .findById(postId)
      .select('_id likesCount userId')
      .lean();

    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.likeModel.findOne({ postId, userId: user._id });

    if (existing && existing.isDeleted === false) {
      return { liked: true, likesCount: post.likesCount ?? 0 };
    }

    const session = (await this.postModel.db.startSession()) as any;
    try {
      await session.withTransaction(async () => {
        if (existing && existing.isDeleted === true) {
          await this.likeModel.updateOne(
            { _id: existing._id },
            {
              $set: {
                isDeleted: false,
                deletedAt: null,
                updatedBy: { _id: user._id, email: user.email },
              },
            },
            { session },
          );
        } else if (!existing) {
          await this.likeModel.create(
            [
              {
                postId: new Types.ObjectId(postId),
                userId: new Types.ObjectId(user._id as any),
                isDeleted: false,
                createdBy: { _id: user._id, email: user.email },
              },
            ],
            { session },
          );
        }

        await this.postModel.updateOne(
          { _id: postId },
          { $inc: { likesCount: 1 } },
          { session },
        );
      });

      // ⭐⭐ TẠO THÔNG BÁO (không gửi nếu tự like bài của mình)
      if (String(post.userId) !== String(user._id)) {
        await this.notificationsService.createNotification({
          userId: new Types.ObjectId(String(post.userId)), // người nhận thông báo
          fromUserId: new Types.ObjectId(String(user._id)), // người thực hiện
          postId: new Types.ObjectId(postId),
          type: 'LIKE',
        });
      }

      const { likesCount } = (await this.postModel
        .findById(postId)
        .select('likesCount')) ?? { likesCount: 0 };

      // ⭐⭐⭐ ACTION: LIKE
      if (String(post.userId) !== String(user._id)) {
        await this.actionModel.create({
          actorId: user._id,
          targetId: post.userId,
          actionType: 'like',
          postId: new Types.ObjectId(postId),
        });
      }

      // 2. Nếu update thành công → gọi ML server training lại
      try {
        await axios.post('http://36.50.135.249:5000/train');
        console.log('🔥 ML model retrained after user update.');
      } catch (err) {
        console.error('❌ ML training failed:', err.message);
      }

      return { liked: true, likesCount };
    } finally {
      session.endSession();
    }
  }

  // --- UNLIKE ---
  async unlikePost(postId: string, user: IUser) {
    this.ensureObjectId(postId);
    const post = await this.postModel
      .findById(postId)
      .select('_id likesCount userId');
    if (!post) throw new NotFoundException('Post not found');

    const like = await this.likeModel.findOne({
      postId,
      userId: user._id,
      isDeleted: false,
    });
    if (!like) {
      // Chưa like → idempotent
      return { liked: false, likesCount: post.likesCount ?? 0 };
    }

    const session = (await this.postModel.db.startSession()) as any;
    try {
      await session.withTransaction(async () => {
        await this.likeModel.updateOne(
          { _id: like._id },
          {
            $set: {
              isDeleted: true,
              deletedAt: new Date(),
              deletedBy: { _id: user._id, email: user.email },
              updatedBy: { _id: user._id, email: user.email },
            },
          },
          { session },
        );
        await this.postModel.updateOne(
          { _id: postId },
          { $inc: { likesCount: -1 } },
          { session },
        );
      });

      const { likesCount } = (await this.postModel
        .findById(postId)
        .select('likesCount')) ?? { likesCount: 0 };

      // ⭐⭐⭐ ACTION: UNLIKE → soft delete
      await this.actionModel.updateOne(
        {
          actorId: user._id,
          targetId: post.userId,
          actionType: 'like',
          postId: post._id,
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

      return { liked: false, likesCount };
    } finally {
      session.endSession();
    }
  }

  // --- TOGGLE (1 API) ---
  async toggleLike(postId: string, user: IUser) {
    const liked = await this.hasLiked(postId, String(user._id));
    if (liked) return this.unlikePost(postId, user);
    return this.likePost(postId, user);
  }
}

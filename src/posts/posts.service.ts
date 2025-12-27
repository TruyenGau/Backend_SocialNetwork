import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { PostDocument, Post } from './schemas/post.schemas';
import { IUser } from 'src/users/users.interface';
import mongoose, { SortOrder, Types } from 'mongoose';
import aqp from 'api-query-params';
import { Like, LikeDocument } from 'src/likes/schemas/like.schemas';
import { Comment, CommentDocument } from 'src/comments/schemas/comment.schema';

import { User, UserDocument } from 'src/users/schemas/user.schema';
import {
  Community,
  CommunityDocument,
} from 'src/communities/schemas/community.schema';
import { Follow, FollowDocument } from 'src/follows/schemas/follow.schemas';
import axios from 'axios';
import { CreateBirthdayPostDto } from './dto/create-birthday-post.dto';
import { ReviewPostDto } from './dto/review-post.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: SoftDeleteModel<PostDocument>,
    @InjectModel(Comment.name)
    private commentModel: SoftDeleteModel<CommentDocument>,

    @InjectModel(Like.name) private likeModel: SoftDeleteModel<LikeDocument>,
    @InjectModel(User.name) private userModel: SoftDeleteModel<UserDocument>,
    @InjectModel(Follow.name)
    private followModel: SoftDeleteModel<FollowDocument>,

    @InjectModel(Community.name)
    private communityModel: SoftDeleteModel<CommunityDocument>,
  ) {}

  async create(createPostDto: CreatePostDto, user: IUser) {
    const {
      namePost,
      content,
      userId,
      communityId,
      images = [],
      videos = [],

      // 🔥 AI FLAG TỪ IMAGE
      aiFlag: imageAiFlag,
      aiReason: imageAiReason,
    } = createPostDto;

    const TOXIC_THRESHOLD = 0.55;

    // =========================
    // 1. INIT STATE
    // =========================
    let toxicScore = 0;
    let aiFlag = false;
    let aiReason: string | null = null;
    let status: 'APPROVED' | 'PENDING' = 'APPROVED';

    // 🔥 QUAN TRỌNG: LÝ DO PENDING
    let pendingReason:
      | 'AI_TOXIC'
      | 'PRIVATE_COMMUNITY'
      | 'AI_SERVICE_DOWN'
      | null = null;

    // =========================
    // 2. AI TEXT + IMAGE MODERATION
    // =========================
    try {
      const aiRes = await axios.post('http://36.50.135.249:5000/moderation', {
        text: content,
      });

      toxicScore = aiRes.data?.toxic_score ?? 0;
      const label: string = aiRes.data?.label;

      // ----- TEXT TOXIC -----
      if (label === 'toxic' || toxicScore >= TOXIC_THRESHOLD) {
        status = 'PENDING';
        aiFlag = true;
        aiReason = 'AI detected potentially toxic content';
        pendingReason = 'AI_TOXIC';
      }

      // ----- IMAGE TOXIC -----
      if (imageAiFlag) {
        status = 'PENDING';
        aiFlag = true;

        if (!aiReason) {
          aiReason = imageAiReason ?? 'AI detected sensitive image content';
        }

        pendingReason = 'AI_TOXIC';
      }
    } catch (error) {
      // ❗ FAIL-SAFE
      status = 'PENDING';
      aiFlag = true;
      aiReason = 'AI moderation service unavailable';
      pendingReason = 'AI_SERVICE_DOWN';
    }

    // =========================
    // 3. CHECK COMMUNITY
    // =========================
    if (communityId) {
      const community = await this.communityModel.findById(communityId);

      if (!community) {
        return {
          success: false,
          message: 'Community không tồn tại!',
        };
      }

      // 🔒 PRIVATE COMMUNITY
      if (community.visibility === 'PRIVATE') {
        const isAdmin = community.admins.map(String).includes(String(user._id));

        if (!isAdmin) {
          status = 'PENDING';

          // ⚠️ CHỈ GÁN NẾU KHÔNG PHẢI DO AI
          if (!pendingReason) {
            pendingReason = 'PRIVATE_COMMUNITY';
          }
        }
      }

      // CHỈ TĂNG COUNT NẾU ĐƯỢC DUYỆT
      if (status === 'APPROVED') {
        await this.communityModel.updateOne(
          { _id: communityId },
          { $inc: { postsCount: 1 } },
        );
      }
    }

    // =========================
    // 4. CREATE POST (LUÔN TẠO)
    // =========================
    const newPost = await this.postModel.create({
      namePost,
      content,
      images,
      videos,
      userId,
      communityId,
      status,

      // ===== AI INFO =====
      aiScore: toxicScore,
      aiFlag,
      aiReason,

      topic: 'unknown',

      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    // =========================
    // 5. SPAM CHECK
    // =========================
    const spamResult = await this.detectSpam(user._id.toString(), content);

    // =========================
    // 6. MESSAGE CHUẨN NGỮ NGHĨA
    // =========================
    let message = 'Đăng bài thành công';

    if (status === 'PENDING') {
      switch (pendingReason) {
        case 'AI_TOXIC':
          message =
            'Tạo bài viết thành công. Nội dung có dấu hiệu nhạy cảm, đang chờ admin duyệt.';
          break;

        case 'PRIVATE_COMMUNITY':
          message =
            'Tạo bài viết thành công. Nhóm riêng tư yêu cầu admin duyệt bài.';
          break;

        case 'AI_SERVICE_DOWN':
          message =
            'Tạo bài viết thành công. Hệ thống AI đang tạm ngưng, bài viết chờ admin duyệt.';
          break;

        default:
          message = 'Bài viết đang chờ admin duyệt.';
      }
    }

    // =========================
    // 7. RESPONSE
    // =========================
    return {
      success: true,
      message,
      post: newPost,
      spam: spamResult,
    };
  }

  async findAll(
    currentPage: number,
    limit: number,
    qs: string,
    user: IUser,
  ): Promise<any> {
    const { filter, sort, population, projection } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    const page = Math.max(Number(currentPage) || 1, 1);
    const pageSize = Math.max(Number(limit) || 10, 1);
    const skip = (page - 1) * pageSize;

    // ⭐ lấy danh sách user mà mình follow
    const following = await this.followModel
      .find({ follower: user._id })
      .select('following')
      .lean();

    const followingIds = following.map((f) => f.following);

    // ⭐ thêm chính mình vào feed
    const feedUserIds = [...followingIds, user._id];

    // ⭐ CHỈ lấy bài của người mình follow
    filter.userId = { $in: feedUserIds };

    // ⭐ LOẠI BỎ bài viết thuộc cộng đồng (community)
    filter.$or = [{ communityId: null }, { communityId: { $exists: false } }];
    filter.status = 'APPROVED';
    filter.isDeleted = false;

    // ⭐ xử lý sort
    let sortObj: Record<string, SortOrder>;
    if (sort && typeof sort === 'object' && Object.keys(sort).length > 0) {
      sortObj = Object.entries(sort).reduce((acc, [k, v]) => {
        acc[k] = v as SortOrder;
        return acc;
      }, {});
    } else {
      sortObj = { createdAt: -1 as SortOrder };
    }

    // ⭐ chạy query song song
    const [totalItems, posts] = await Promise.all([
      this.postModel.countDocuments(filter),
      this.postModel
        .find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(pageSize)
        .populate({ path: 'userId', select: 'name avatar' })
        .populate('communityId', 'name _id') // vẫn populate nếu muốn kiểm tra
        .populate({
          path: 'sharedPostId',
          populate: [
            { path: 'userId', select: 'name avatar' },
            { path: 'communityId', select: 'name _id' },
          ],
        })
        .populate({ path: 'taggedUserIds', select: 'name avatar _id' })

        .populate(population)
        .select(projection as any)
        .lean(),
    ]);

    // ⭐ lấy danh sách like
    const postIds = posts.map((p) => p._id);
    const userLikes = await this.likeModel
      .find({ postId: { $in: postIds }, userId: user._id, isDeleted: false })
      .select('postId')
      .lean();

    const likedSet = new Set(userLikes.map((l) => l.postId.toString()));

    const result = posts.map((p) => ({
      ...p,
      likesCount: p.likesCount ?? 0,
      isLiked: likedSet.has(p._id.toString()),
    }));

    return {
      meta: {
        current: page,
        pageSize,
        pages: Math.ceil(totalItems / pageSize),
        total: totalItems,
      },
      result,
    };
  }

  async findAllPost(
    currentPage: number,
    limit: number,
    qs: string,
  ): Promise<any> {
    const { filter, sort, population, projection } = aqp(qs);

    // Xóa các key không liên quan
    delete filter.current;
    delete filter.pageSize;

    // Pagination
    const page = Math.max(Number(currentPage) || 1, 1);
    const pageSize = Math.max(Number(limit) || 10, 1);
    const skip = (page - 1) * pageSize;

    // Sort
    let sortObj: Record<string, SortOrder>;
    if (sort && typeof sort === 'object' && Object.keys(sort).length > 0) {
      sortObj = Object.entries(sort).reduce((acc, [k, v]) => {
        acc[k] = v as SortOrder;
        return acc;
      }, {});
    } else {
      sortObj = { createdAt: -1 as SortOrder };
    }

    // Chạy query song song
    const [totalItems, posts] = await Promise.all([
      this.postModel.countDocuments(filter),
      this.postModel
        .find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(pageSize)
        .populate({ path: 'userId', select: 'name avatar' })
        .populate('communityId', 'name avatar _id')
        .populate(population)
        .select(projection as any)
        .lean(),
    ]);

    return {
      meta: {
        current: page,
        pageSize,
        pages: Math.ceil(totalItems / pageSize),
        total: totalItems,
      },
      result: posts,
    };
  }

  async findAllWithGroup(
    currentPage: number,
    limit: number,
    qs: any,
    user: IUser,
    groupId: string,
  ): Promise<any> {
    /* =========================
     * 1. PARSE QUERY
     * ========================= */
    const { filter, sort, population, projection } = aqp(qs);

    delete filter.current;
    delete filter.pageSize;

    /* =========================
     * 2. FILTER THEO GROUP
     * ========================= */
    if (groupId) {
      filter.communityId = groupId;
    }

    const community = await this.communityModel.findById(groupId).lean();

    const isAdmin =
      !!community && community.admins.map(String).includes(String(user._id));

    /* =========================
     * 3. LOGIC DUYỆT BÀI
     * ========================= */
    if (filter.status === 'PENDING') {
      if (isAdmin) {
        // admin thấy toàn bộ bài chờ duyệt
        filter.status = 'PENDING';
      } else {
        // member chỉ thấy bài chờ duyệt của chính mình
        filter.status = 'PENDING';
        filter.userId = user._id;
      }
    } else {
      // mặc định → chỉ lấy bài đã duyệt
      filter.status = 'APPROVED';
    }

    /* =========================
     * 4. PAGINATION
     * ========================= */
    const page = Math.max(Number(currentPage) || 1, 1);
    const pageSize = Math.max(Number(limit) || 10, 1);
    const skip = (page - 1) * pageSize;

    /* =========================
     * 5. SORT (PIN FIRST)
     * ========================= */
    const sortObj: Record<string, SortOrder> = {
      isPinned: -1,
      pinnedAt: -1,
    };

    if (sort && typeof sort === 'object' && Object.keys(sort).length > 0) {
      Object.entries(sort).forEach(([key, value]) => {
        sortObj[key] = value as SortOrder;
      });
    } else {
      sortObj.createdAt = -1;
    }

    /* =========================
     * 6. QUERY SONG SONG
     * ========================= */
    const [totalItems, posts] = await Promise.all([
      this.postModel.countDocuments(filter),

      this.postModel
        .find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(pageSize)
        .populate({ path: 'userId', select: 'name avatar' })
        .populate('communityId', 'name _id')
        .populate(population)
        .select(projection as any)
        .lean(),
    ]);

    /* =========================
     * 7. LIKE STATUS
     * ========================= */
    const postIds = posts.map((p) => p._id);

    const userLikes = await this.likeModel
      .find({
        postId: { $in: postIds },
        userId: user._id,
        isDeleted: false,
      })
      .select('postId')
      .lean();

    const likedSet = new Set(userLikes.map((l) => l.postId.toString()));

    /* =========================
     * 8. SAVE STATUS
     * ========================= */
    const userSaved = await this.userModel
      .findById(user._id)
      .select('savedPosts')
      .lean();

    const savedSet = new Set(
      (userSaved?.savedPosts || []).map((id) => id.toString()),
    );

    /* =========================
     * 9. FINAL RESULT
     * ========================= */
    const result = posts.map((p) => ({
      ...p,
      likesCount: p.likesCount ?? 0,
      commentsCount: p.commentsCount ?? 0,
      isLiked: likedSet.has(p._id.toString()),
      isSaved: savedSet.has(p._id.toString()),
    }));

    return {
      meta: {
        current: page,
        pageSize,
        pages: Math.ceil(totalItems / pageSize),
        total: totalItems,
      },
      result,
    };
  }

  async findAllById(
    currentPage: number,
    limit: number,
    qs: string,
    userId: string,
  ): Promise<any> {
    const { filter, sort, population, projection } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    filter.userId = userId;

    const page = Math.max(Number(currentPage) || 1, 1);
    const pageSize = Math.max(Number(limit) || 10, 1);
    const skip = (page - 1) * pageSize;

    let sortObj: Record<string, SortOrder>;
    if (sort && typeof sort === 'object' && Object.keys(sort).length > 0) {
      sortObj = Object.entries(sort).reduce<Record<string, SortOrder>>(
        (acc, [k, v]) => {
          acc[k] = v as SortOrder;
          return acc;
        },
        {},
      );
    } else {
      sortObj = { createdAt: -1 as SortOrder };
    }

    const [totalItems, posts] = await Promise.all([
      this.postModel.countDocuments(filter),
      this.postModel
        .find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(pageSize)
        .populate({
          path: 'userId',
          select: 'name avatar',
        })
        .select(projection as any)
        .lean(),
    ]);

    const postIds = posts.map((p) => p._id);

    const result = posts.map((p) => ({
      ...p,
      likesCount: p.likesCount ?? 0,
      isLiked: false,
    }));

    return {
      meta: {
        current: page,
        pageSize,
        pages: Math.ceil(totalItems / pageSize),
        total: totalItems,
      },
      result,
    };
  }

  async findOne(id: string, user: IUser): Promise<any> {
    const _id = new Types.ObjectId(String(id));

    const post = await this.postModel
      .findById(_id)
      .populate('communityId', 'name _id')
      .lean();

    if (!post || post.isDeleted) {
      throw new NotFoundException('Post không tồn tại');
    }

    // ===== CHECK USER ĐÃ LIKE POST HAY CHƯA =====
    const userLike = await this.likeModel.findOne({
      postId: _id,
      userId: user._id,
      isDeleted: false,
    });

    const author = await this.userModel
      .findById(post.userId)
      .select('avatar name')
      .lean();

    const isLiked = !!userLike;
    const likesCount = post.likesCount ?? 0;

    // ===== LẤY COMMENT =====
    const comments = await this.commentModel
      .find({ postId: _id, isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean();

    // ===== LẤY THÔNG TIN USER CỦA COMMENT =====
    const userIds = [...new Set(comments.map((c) => String(c.userId)))];

    const users = await this.userModel
      .find({ _id: { $in: userIds } })
      .select('_id avatar name')
      .lean();

    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const byId = new Map<string, any>();
    for (const c of comments) {
      const u = userMap.get(String(c.userId));

      byId.set(String(c._id), {
        _id: c._id,
        postId: c.postId,
        userId: c.userId,
        parentId: c.parentId,
        content: c.content,
        likesCount: c.likesCount ?? 0,
        repliesCount: c.repliesCount ?? 0,
        createdBy: c.createdBy,
        updatedBy: c.updatedBy,
        user: {
          avatar: u?.avatar ?? null,
          name: u?.name ?? 'Unknown',
        },
        createdAt: c.createdAt,
        children: [],
      });
    }

    const roots: any[] = [];
    for (const node of byId.values()) {
      if (node.parentId) {
        const p = byId.get(String(node.parentId));
        if (p) p.children.push(node);
        else roots.push(node);
      } else {
        roots.push(node);
      }
    }

    const sortAsc = (a: any, b: any) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    const sortDesc = (a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

    const sortChildren = (list: any[]) => {
      list.sort(sortAsc);
      for (const n of list) if (n.children?.length) sortChildren(n.children);
    };
    sortChildren(roots);
    roots.sort(sortDesc);

    return {
      ...post,
      likesCount,
      isLiked,
      comments: roots,
      author,
    };
  }

  async update(_id: string, updatePostDto: UpdatePostDto, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      throw new BadRequestException('Not found Post');
    }

    const { namePost, content } = updatePostDto;

    const updated = await this.postModel.updateOne(
      { _id },
      {
        namePost,
        content,
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );
    return updated;
  }

  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return 'not found post';
    }

    const post = await this.postModel.findById(id);
    if (!post) {
      throw new NotFoundException('Post không tồn tại');
    }
    await this.postModel.updateOne(
      { _id: id },
      {
        deletedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );

    if (post.communityId) {
      await this.communityModel.updateOne(
        { _id: post.communityId },
        { $inc: { postsCount: -1 } },
      );
    }

    return this.postModel.softDelete({ _id: id });
  }

  async getTotoal() {
    // === Tổng số User, Post, Community ===
    const totalUsers = await this.userModel.countDocuments({});
    const totalPosts = await this.postModel.countDocuments({});
    const totalCommunities = await this.communityModel.countDocuments({});

    // === User theo tháng ===
    const usersByMonth = await this.userModel.aggregate([
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formattedUsersByMonth = usersByMonth.map((u) => ({
      month: this.monthName(u._id),
      count: u.count,
    }));

    // === Post theo tháng ===
    const postsByMonth = await this.postModel.aggregate([
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formattedPostsByMonth = postsByMonth.map((p) => ({
      month: this.monthName(p._id),
      count: p.count,
    }));

    // === Role Distribution ===
    const roles = await this.userModel.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    const formattedRoles = roles.map((r) => ({
      role: r._id,
      count: r.count,
    }));

    // === Final result ===
    return {
      totals: {
        users: totalUsers,
        posts: totalPosts,
        communities: totalCommunities,
      },
      usersByMonth: formattedUsersByMonth,
      postsByMonth: formattedPostsByMonth,
      roles: formattedRoles,
    };
  }
  private monthName(month: number): string {
    return [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ][month - 1];
  }

  async toggleSavePost(postId: string, user: IUser) {
    const userId = user._id;

    const existed = await this.userModel.exists({
      _id: userId,
      savedPosts: postId,
    });

    if (existed) {
      // 👉 Bỏ lưu
      await this.userModel.updateOne(
        { _id: userId },
        { $pull: { savedPosts: postId } },
      );

      return { isSaved: false };
    } else {
      // 👉 Lưu
      await this.userModel.updateOne(
        { _id: userId },
        { $addToSet: { savedPosts: postId } },
      );

      return { isSaved: true };
    }
  }

  async getSavedPosts(user: IUser): Promise<any> {
    const userDoc = await this.userModel
      .findById(user._id)
      .select('savedPosts')
      .lean();

    if (!userDoc?.savedPosts || userDoc.savedPosts.length === 0) {
      return [];
    }

    const posts = await this.postModel
      .find({ _id: { $in: userDoc.savedPosts } })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 })
      .lean();

    return posts.map((post) => ({
      ...post,
      isSaved: true,
    }));
  }

  async approvePost(postId: string, user: IUser) {
    const post = await this.postModel.findById(postId).populate('communityId');
    if (!post) throw new NotFoundException('Post not found');

    const community = post.communityId as any;
    const isAdmin = community.admins.map(String).includes(String(user._id));
    if (!isAdmin) throw new ForbiddenException('No permission');

    post.status = 'APPROVED';
    await post.save();

    await this.communityModel.updateOne(
      { _id: community._id },
      { $inc: { postsCount: 1 } },
    );

    return { success: true };
  }

  async rejectPost(postId: string, user: IUser) {
    const post = await this.postModel.findById(postId).populate('communityId');
    if (!post) throw new NotFoundException('Post not found');

    const community = post.communityId as any;
    const isAdmin = community.admins.map(String).includes(String(user._id));
    if (!isAdmin) throw new ForbiddenException('No permission');

    await this.postModel.deleteOne({ _id: postId });

    return { success: true };
  }

  async sharePost(postId: string, content: string | undefined, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid postId');
    }

    const originalPost = await this.postModel.findById(postId);

    if (!originalPost || originalPost.isDeleted) {
      throw new NotFoundException('Post gốc không tồn tại');
    }

    // ❌ Không cho share post chưa duyệt
    if (originalPost.status !== 'APPROVED') {
      throw new BadRequestException('Post chưa được duyệt');
    }

    // ✅ Tạo post share
    const sharedPost = await this.postModel.create({
      content: content ?? '',
      images: [],
      videos: [],
      userId: user._id,
      sharedPostId: originalPost._id, // ⭐ QUAN TRỌNG
      status: 'APPROVED',
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    return {
      success: true,
      post: sharedPost,
    };
  }

  async createBirthdayPost(dto: CreateBirthdayPostDto, user: IUser) {
    const { content, targetUserId } = dto;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw new BadRequestException('Invalid targetUserId');
    }

    const targetUser = await this.userModel.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('User không tồn tại');
    }

    const post = await this.postModel.create({
      content,
      userId: user._id, // người chúc
      taggedUserIds: [targetUser._id], // ⭐ tag sinh nhật
      postType: 'BIRTHDAY',
      status: 'APPROVED',
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    return {
      success: true,
      post,
    };
  }

  async detectSpam(userId: string, content: string) {
    let spamScore = 0;
    const reasons: string[] = [];

    /* =================================
     * 1️⃣ ĐĂNG QUÁ NHIỀU BÀI
     * ================================= */
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const postCount = await this.postModel.countDocuments({
      userId,
      createdAt: { $gte: fiveMinutesAgo },
    });

    if (postCount >= 5) {
      spamScore += 40;
      reasons.push('Đăng quá nhiều bài trong thời gian ngắn');
    }

    /* =================================
     * 2️⃣ NỘI DUNG TRÙNG LẶP
     * ================================= */
    const recentPosts = await this.postModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    for (const post of recentPosts) {
      const similarity = this.textSimilarity(content, post.content);
      if (similarity > 0.9) {
        spamScore += 50;
        reasons.push('Nội dung bài đăng trùng lặp');
        break;
      }
    }

    /* =================================
     * 3️⃣ CẬP NHẬT USER
     * ================================= */
    if (spamScore > 0) {
      await this.userModel.findByIdAndUpdate(userId, {
        $inc: { spamScore },
        $set: {
          isSpamSuspected: spamScore >= 50,
          spamReason: reasons.join('; '),
        },
      });
    }

    return {
      spamScore,
      isSpamSuspected: spamScore >= 50,
      reasons,
    };
  }

  /* ================================
   * So sánh nội dung đơn giản (Jaccard)
   * ================================ */
  private textSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));

    const intersection = [...wordsA].filter((w) => wordsB.has(w));
    return intersection.length / Math.max(wordsA.size, wordsB.size);
  }

  async globalSearch(keyword: string) {
    if (!keyword || keyword.trim() === '') {
      return { users: [], posts: [] };
    }

    // 👤 SEARCH USER BY NAME
    const users = await this.userModel
      .find({
        name: { $regex: keyword, $options: 'i' },
        isDeleted: { $ne: true },
        block: { $ne: true },
      })
      .select('_id name avatar')
      .limit(5);

    // 📝 SEARCH POST BY CONTENT
    const posts = await this.postModel
      .find({
        content: { $regex: keyword, $options: 'i' },
        isDeleted: { $ne: true },
        status: 'APPROVED',
      })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(5);

    return { users, posts };
  }

  // posts.service.ts
  async findPendingPosts() {
    return this.postModel
      .find({
        status: 'PENDING',
        isDeleted: false,
        $or: [{ communityId: { $exists: false } }, { communityId: null }],
      })
      .populate('userId', 'name email avatar')
      .sort({ createdAt: -1 })
      .lean();
  }

  // posts.service.ts
  async reviewPost(postId: string, dto: ReviewPostDto, admin: IUser) {
    const post = await this.postModel.findById(postId);
    if (!post) {
      throw new NotFoundException('Post không tồn tại');
    }

    if (dto.action === 'APPROVE') {
      post.status = 'APPROVED';
    }

    if (dto.action === 'REJECT') {
      post.status = 'REJECTED';
    }

    if (dto.action === 'DELETE') {
      post.isDeleted = true;
      post.deletedAt = new Date();
    }

    post.updatedAt = new Date();
    await post.save();

    return { success: true };
  }

  // posts.service.ts
  async aiBlockedRateByTime(type: 'day' | 'week') {
    const groupFormat =
      type === 'day'
        ? { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        : { $isoWeek: '$createdAt' };

    return this.postModel.aggregate([
      {
        $group: {
          _id: groupFormat,
          total: { $sum: 1 },
          aiBlocked: {
            $sum: {
              $cond: [{ $eq: ['$aiFlag', true] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          time: '$_id',
          percent: {
            $round: [
              { $multiply: [{ $divide: ['$aiBlocked', '$total'] }, 100] },
              2,
            ],
          },
        },
      },
      { $sort: { time: 1 } },
    ]);
  }
}

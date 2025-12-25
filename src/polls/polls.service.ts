import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';

import { CreatePollDto } from './dto/create-poll.dto';
import { IUser } from 'src/users/users.interface';
import { Poll, PollDocument } from './chemas/poll.schemas';

@Injectable()
export class PollsService {
  constructor(
    @InjectModel(Poll.name)
    private readonly pollModel: Model<PollDocument>,
  ) {}

  // =========================
  // CREATE POLL
  // =========================
  async create(createPollDto: CreatePollDto, user: IUser) {
    const { question, options, communityId, expiredAt } = createPollDto;

    if (expiredAt && new Date(expiredAt) <= new Date()) {
      throw new BadRequestException(
        'Thời gian hết hạn phải lớn hơn thời gian hiện tại',
      );
    }

    const poll = await this.pollModel.create({
      question,
      options: options.map((text) => ({ text })),
      communityId,
      createdBy: new mongoose.Types.ObjectId(user._id),
      expiredAt,
    });

    return poll;
  }

  // =========================
  // GET POLL BY ID
  // =========================
  async findById(id: string) {
    const poll = await this.pollModel.findById(id);

    if (!poll) {
      throw new NotFoundException('Poll không tồn tại');
    }

    // ⏰ Tự đóng poll nếu hết hạn
    if (poll.expiredAt && poll.expiredAt < new Date()) {
      poll.isActive = false;
      await poll.save();
    }

    // ✅ TRẢ RESPONSE RIÊNG (ẨN voters)
    return {
      _id: poll._id,
      question: poll.question,
      options: poll.options.map((opt) => ({
        text: opt.text,
        votes: opt.votes,
      })),
      isActive: poll.isActive,
      expiredAt: poll.expiredAt,
    };
  }

  // =========================
  // VOTE
  // =========================
  async vote(pollId: string, optionIndex: number, user: IUser) {
    const poll = await this.pollModel.findById(pollId);

    if (!poll) {
      throw new NotFoundException('Poll không tồn tại');
    }

    // ⏰ check hết hạn
    if (poll.expiredAt && new Date(poll.expiredAt).getTime() <= Date.now()) {
      poll.isActive = false;
      await poll.save();
      throw new BadRequestException('Poll đã hết hạn');
    }

    if (!poll.isActive) {
      throw new BadRequestException('Poll đã đóng');
    }

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      throw new BadRequestException('Lựa chọn không hợp lệ');
    }

    const userId = new mongoose.Types.ObjectId(user._id);

    // 🔄 1. GỠ USER KHỎI OPTION CŨ (NẾU CÓ)
    poll.options.forEach((opt) => {
      const index = opt.voters.findIndex((v) => String(v) === String(userId));

      if (index !== -1) {
        opt.voters.splice(index, 1);
        opt.votes = Math.max(0, opt.votes - 1);
      }
    });

    // ✅ 2. THÊM VOTE MỚI
    poll.options[optionIndex].voters.push(userId);
    poll.options[optionIndex].votes += 1;

    await poll.save();

    // ❌ Ẩn voters khi trả về
    return {
      _id: poll._id,
      question: poll.question,
      options: poll.options.map((opt) => ({
        text: opt.text,
        votes: opt.votes,
      })),
      isActive: poll.isActive,
      expiredAt: poll.expiredAt,
    };
  }

  // =========================
  // GET POLLS BY COMMUNITY
  // =========================
  async findByCommunity(communityId: string) {
    const now = new Date();

    const polls = await this.pollModel
      .find({ communityId })
      .sort({ createdAt: -1 });

    for (const poll of polls) {
      if (
        poll.isActive &&
        poll.expiredAt &&
        new Date(poll.expiredAt).getTime() <= now.getTime()
      ) {
        poll.isActive = false;
        await poll.save();
      }
    }

    return polls.map((poll) => ({
      _id: poll._id,
      question: poll.question,
      options: poll.options.map((opt) => ({
        text: opt.text,
        votes: opt.votes,
      })),
      isActive: poll.isActive,
      expiredAt: poll.expiredAt,
    }));
  }
}

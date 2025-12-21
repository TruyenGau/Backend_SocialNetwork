import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';

import {
  Report,
  ReportDocument,
  ReportAction,
  ReportStatus,
} from './schemas/report.schemas';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

import { Post, PostDocument } from 'src/posts/schemas/post.schemas';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { IUser } from 'src/users/users.interface';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name)
    private reportModel: SoftDeleteModel<ReportDocument>,

    @InjectModel(Post.name)
    private postModel: SoftDeleteModel<PostDocument>,

    @InjectModel(User.name)
    private userModel: SoftDeleteModel<UserDocument>,
  ) {}

  // =========================
  // USER: CREATE REPORT
  // =========================
  async create(dto: CreateReportDto, user: IUser) {
    const { targetType, targetId } = dto;

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      throw new BadRequestException('Invalid targetId');
    }

    // ❌ Không cho report chính mình
    if (targetType === 'USER' && String(targetId) === String(user._id)) {
      throw new BadRequestException('Không thể report chính mình');
    }

    // ❌ Post không tồn tại
    if (targetType === 'POST') {
      const post = await this.postModel.findById(targetId);
      if (!post || post.isDeleted) {
        throw new NotFoundException('Post không tồn tại');
      }
    }

    const report = await this.reportModel.create({
      reporterId: user._id,
      ...dto,
    });

    return {
      success: true,
      report,
    };
  }

  // =========================
  // ADMIN: LIST REPORT
  // =========================
  async findAll(status?: string) {
    const filter: any = {};
    if (status) filter.status = status;

    return this.reportModel
      .find(filter)
      .populate('reporterId', 'name email')
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
  }

  // =========================
  // ADMIN: RESOLVE REPORT
  // =========================
  async resolve(reportId: string, dto: ResolveReportDto, admin: IUser) {
    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      throw new BadRequestException('Invalid reportId');
    }

    const report = await this.reportModel.findById(reportId);
    if (!report) {
      throw new NotFoundException('Report không tồn tại');
    }

    /* =========================
     * ACTION LOGIC
     * ========================= */

    // XÓA POST
    if (dto.action === ReportAction.DELETE && report.targetType === 'POST') {
      await this.postModel.updateOne(
        { _id: report.targetId },
        {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: {
            _id: admin._id,
            email: admin.email,
          },
        },
      );
    }

    // BAN USER
    if (dto.action === ReportAction.BAN && report.targetType === 'USER') {
      await this.userModel.updateOne(
        { _id: report.targetId },
        {
          block: true,
          deletedAt: new Date(),
          deletedBy: {
            _id: admin._id,
            email: admin.email,
          },
        },
      );
    }

    // WARNING / NONE → KHÔNG ĐỘNG DB KHÁC

    /* =========================
     * UPDATE REPORT (ALWAYS)
     * ========================= */

    report.status = ReportStatus.RESOLVED;
    report.action = dto.action;
    report.adminId = admin._id as any;
    report.updatedAt = new Date() as any;

    await report.save();

    return {
      success: true,
      message: 'Report đã được xử lý',
    };
  }

  async getTopReportReasons() {
    return this.reportModel.aggregate([
      {
        $group: {
          _id: '$reason',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          reason: '$_id',
          count: 1,
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);
  }

  async getReportByMonth() {
    return this.reportModel.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          total: { $sum: 1 },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
        },
      },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: '$_id.month' },
              '/',
              { $toString: '$_id.year' },
            ],
          },
          total: 1,
        },
      },
    ]);
  }
}

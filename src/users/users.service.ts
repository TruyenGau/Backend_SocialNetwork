import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto, RegisterUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User as UserM, UserDocument } from './schemas/user.schema';
import mongoose, { Model } from 'mongoose';
import { genSaltSync, hashSync, compareSync } from 'bcryptjs';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from './users.interface';
import { User } from 'src/auth/decorator/customize';
import aqp from 'api-query-params';
import { Role, RoleDocument } from 'src/roles/schema/role.schema';
import { ADMIN_ROLE, USER_ROLE } from 'src/databases/sample';
import axios from 'axios';
import { Follow, FollowDocument } from 'src/follows/schemas/follow.schemas';
import { Action, ActionDocument } from './schemas/actions.schema';
import {
  SpamWarning,
  SpamWarningDocument,
} from './schemas/spam-warning.schema';
import * as crypto from 'crypto';
import { MailService } from './mail.service';
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserM.name) private userModel: SoftDeleteModel<UserDocument>,
    @InjectModel(Role.name) private roleModel: SoftDeleteModel<RoleDocument>,
    @InjectModel(Follow.name)
    private followModel: SoftDeleteModel<FollowDocument>,

    @InjectModel(Action.name)
    private actionModel: SoftDeleteModel<ActionDocument>,

    @InjectModel(SpamWarning.name)
    private spamWarningModel: SoftDeleteModel<SpamWarningDocument>,
    private readonly mailService: MailService,
  ) {}

  getHashPassword = (password: string) => {
    const salt = genSaltSync(10);
    const hash = hashSync(password, salt);
    return hash;
  };

  async create(createUserDto: CreateUserDto, @User() user: IUser) {
    const isExist = await this.userModel.findOne({
      email: createUserDto.email,
    });
    if (isExist) {
      throw new BadRequestException(`Email ${createUserDto.email} đã tồn tại`);
    }

    const hashPassword = this.getHashPassword(createUserDto.password);

    const newUser = await this.userModel.create({
      ...createUserDto,
      role: createUserDto.role,
      password: hashPassword,
      createdBy: {
        _id: user?._id,
        email: user?.email,
      },
    });

    // 2. Nếu update thành công → gọi ML server training lại
    try {
      await axios.post('http://36.50.135.249:5000/train');
      console.log('🔥 ML model retrained after user update.');
    } catch (err) {
      console.error('❌ ML training failed:', err.message);
    }

    return newUser;
  }

  async findAll(currentPage: number, limit: number, qs: string) {
    const { filter, sort, projection, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    let offset = (+currentPage - 1) * +limit;
    let defaultLimit = +limit ? +limit : 10;

    const totalItems = (await this.userModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.userModel
      .find(filter)
      .skip(offset)
      .limit(defaultLimit)
      // @ts-ignore: Unreachable code error
      .sort(sort)
      .select('-password')
      .populate(population)
      .exec();

    return {
      meta: {
        current: currentPage, //trang hiện tại
        pageSize: limit, //số lượng bản ghi đã lấy
        pages: totalPages, //tổng số trang với điều kiện query
        total: totalItems, // tổng số phần tử (số bản ghi)
      },
      result, //kết quả query
    };
  }

  findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return 'not found user';
    }

    return this.userModel
      .findOne({ _id: id })
      .select('-password')
      .populate({ path: 'role', select: { name: 1, _id: 1 } });
  }

  findOneByUserName(username: string) {
    return this.userModel
      .findOne({ email: username })
      .populate({ path: 'role', select: { name: 1 } });
  }
  // users.service.ts
  findOneByUserNameAndType(username: string, type?: string) {
    const query: any = { email: username };
    if (type) query.type = type; // 👈 THÊM TYPE

    return this.userModel
      .findOne(query)
      .populate({ path: 'role', select: { name: 1 } });
  }

  isValidPassword(password: string, hash: string) {
    return compareSync(password, hash);
  }
  async update(updateUserDto: UpdateUserDto, user: IUser) {
    // 1. Update thông tin user
    const result = await this.userModel.updateOne(
      { _id: updateUserDto._id },
      {
        ...updateUserDto,
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );

    // 2. Nếu update thành công → gọi ML server training lại
    try {
      await axios.post('http://36.50.135.249:5000/train');
      console.log('🔥 ML model retrained after user update.');
    } catch (err) {
      console.error('❌ ML training failed:', err.message);
    }

    return result;
  }

  async remove(id: string, @User() user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return 'not found company';
    }
    //khong xóa tài khoản admin
    const foundUser = await this.userModel.findById(id);
    if (foundUser && foundUser.email === 'admin@gmail.com') {
      throw new BadRequestException(
        'Không thể xóa tài khoản gmail admin@gmail.com',
      );
    }
    await this.userModel.updateOne(
      { _id: id },
      {
        deletedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );
    return this.userModel.softDelete({ _id: id });
  }

  async register(user: RegisterUserDto) {
    const { name, email, password, age, gender, address } = user;
    const isExist = await this.userModel.findOne({ email });
    if (isExist) {
      throw new BadRequestException(`Email ${email} đã tồn tại `);
    }
    const userRole = await this.roleModel.findOne({ name: USER_ROLE });

    const hashPassword = this.getHashPassword(password);
    let newRegister = await this.userModel.create({
      name,
      email,
      password: hashPassword,
      age,
      gender,
      address,
      role: userRole?._id,
    });
    return newRegister;
  }
  async registerMedia(type: string, username: string) {
    const isExist = await this.userModel.findOne({
      email: username,
      type: type, // 🔥 CHECK ĐÚNG CẢ TYPE
    });

    if (isExist) {
      throw new BadRequestException(
        `Tài khoản ${username} đã tồn tại với phương thức ${type}`,
      );
    }

    const userRole = await this.roleModel.findOne({ name: ADMIN_ROLE });

    let newRegister = await this.userModel.create({
      password: '',
      name: username,
      email: username,
      role: userRole?._id,
      type: type,
    });
    return newRegister;
  }

  updateUserToken = async (refreshToken: string, _id: string) => {
    const isLogin = !!refreshToken;
    return this.userModel.updateOne(
      { _id },
      {
        $set: {
          refreshToken,
          // online: isLogin, // login → true, logout → false
          lastActive: new Date(), // mốc hoạt động gần nhất
        },
      },
    );
  };

  findUserByUser = async (refreshToken: string) => {
    return await this.userModel
      .findOne({ refreshToken })
      .populate({ path: 'role', select: { name: 1 } });
  };

  async getTodayBirthdays(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) return [];

    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    const following = await this.followModel
      .find({ follower: userId }) // hard delete → OK
      .select('following')
      .lean();

    const followingIds = following
      .map((f) => f.following)
      .filter(Boolean)
      .map((id) => new mongoose.Types.ObjectId(id.toString()));

    followingIds.push(new mongoose.Types.ObjectId(userId));

    return this.userModel.aggregate([
      {
        $match: {
          _id: { $in: followingIds },
          birthday: { $ne: null },
          $expr: {
            $and: [
              { $eq: [{ $month: '$birthday' }, todayMonth] },
              { $eq: [{ $dayOfMonth: '$birthday' }, todayDay] },
            ],
          },
        },
      },
      {
        $project: {
          name: 1,
          avatar: 1,
          birthday: 1,
        },
      },
    ]);
  }

  async getAllUserML() {
    const users = await this.userModel
      .find()
      .select('name age gender school address  followersCount followingCount')
      .lean();

    return { users };
  }
  async setOnline(userId: string, online: boolean) {
    return this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          online,
          lastActive: new Date(),
        },
      },
    );
  }

  async getUserPermissions(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .populate({
        path: 'role',
        populate: {
          path: 'permissions',
          model: 'Permission',
        },
      })
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // ép kiểu an toàn cho role (vì populate trả về object chứ không phải ObjectId)
    const role: any = user.role || null;

    return {
      userId: user._id,
      role: role?.name ?? null,
      permissions: Array.isArray(role?.permissions) ? role.permissions : [],
    };
  }

  async getActionsForML() {
    const actions = await this.actionModel
      .find({
        isDeleted: false,
        actionType: { $in: ['like', 'comment', 'follow'] },
      })
      .select('_id actorId targetId actionType createdAt')
      .lean();

    return {
      actions,
    };
  }

  async getSpamSuspectedUsers() {
    const users = await this.userModel
      .find({
        isSpamSuspected: true,
        isDeleted: false,
      })
      .select('name email spamScore spamReason block createdAt')
      .sort({ spamScore: -1 }) // user nguy hiểm nhất lên trước
      .lean();

    return {
      total: users.length,
      users,
    };
  }
  async createWarning(userId: string, adminId: string, message: string) {
    return this.spamWarningModel.create({
      userId,
      adminId,
      message,
    });
  }
  async handleSpamUser(
    userId: string,
    action: 'WARN' | 'BLOCK' | 'UNBLOCK' | 'RESET',
    admin: IUser,
    message?: string,
  ) {
    // 1️⃣ Check user tồn tại
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    /* ======================================
     * ⚠️ 1. CẢNH CÁO
     * - Lưu nội dung cảnh cáo
     * - Reset spamScore
     * ====================================== */
    if (action === 'WARN') {
      if (!message || !message.trim()) {
        throw new BadRequestException('Vui lòng nhập nội dung cảnh cáo');
      }

      // ✅ GỌI SERVICE ĐÚNG CHUẨN
      await this.createWarning(userId, admin._id.toString(), message);

      // reset spam
      await this.userModel.findByIdAndUpdate(userId, {
        spamScore: 0,
        isSpamSuspected: false,
        spamReason: null,
      });

      return {
        success: true,
        message: 'Đã cảnh cáo user và reset spam score',
      };
    }

    /* ======================================
     * 🚫 2. KHÓA TÀI KHOẢN
     * ====================================== */
    if (action === 'BLOCK') {
      if (user.block === true) {
        throw new BadRequestException('Tài khoản đã bị khóa trước đó');
      }

      await this.userModel.findByIdAndUpdate(userId, {
        block: true,
      });

      return {
        success: true,
        message: 'Đã khóa tài khoản user',
      };
    }

    /* ======================================
     * 🔓 3. MỞ KHÓA TÀI KHOẢN
     * ====================================== */
    if (action === 'UNBLOCK') {
      if (user.block === false) {
        throw new BadRequestException('Tài khoản đang ở trạng thái hoạt động');
      }

      await this.userModel.findByIdAndUpdate(userId, {
        block: false,
      });

      return {
        success: true,
        message: 'Đã mở khóa tài khoản user',
      };
    }

    /* ======================================
     * ♻️ 4. BỎ NGHI NGỜ SPAM
     * ====================================== */
    if (action === 'RESET') {
      await this.userModel.findByIdAndUpdate(userId, {
        spamScore: 0,
        isSpamSuspected: false,
        spamReason: null,
      });

      return {
        success: true,
        message: 'Đã bỏ nghi ngờ spam cho user',
      };
    }

    throw new BadRequestException('Hành động không hợp lệ');
  }

  async getSpamWarningsByUser(userId: string) {
    const warnings = await this.spamWarningModel
      .find({
        userId,
        isDeleted: false,
      })
      .sort({ createdAt: -1 }) // mới nhất lên trước
      .populate({
        path: 'adminId',
        select: 'name email',
      })
      .lean();

    return {
      total: warnings.length,
      warnings,
    };
  }
  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });

    // ❗ KHÔNG LỘ EMAIL CÓ TỒN TẠI HAY KHÔNG
    if (!user) {
      return {
        success: true,
        message:
          'Nếu email tồn tại trong hệ thống, link đặt lại mật khẩu đã được gửi.',
      };
    }

    // 🔐 TẠO TOKEN
    const token = crypto.randomBytes(32).toString('hex');

    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/auth/reset?token=${token}`;

    await this.mailService.sendResetPasswordMail(user.email, resetLink);

    return {
      success: true,
      message: 'Link đặt lại mật khẩu đã được gửi về email.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return {
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn.',
      };
    }

    user.password = this.getHashPassword(newPassword);

    // ❌ XOÁ TOKEN SAU KHI DÙNG
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công.',
    };
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { IUser } from 'src/users/users.interface';
import { access } from 'fs';
import { RegisterUserDto } from 'src/users/dto/create-user.dto';
import { ConfigService } from '@nestjs/config';
import ms from 'ms';
import { Response } from 'express';
import { RolesService } from 'src/roles/roles.service';
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private roleService: RolesService,
  ) {}
  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByUserName(username);
    if (user) {
      const isValid = this.usersService.isValidPassword(pass, user.password);
      if (isValid == true) {
        const userRole = user.role as unknown as { _id: string; name: string };
        const temp = await this.roleService.findOne(userRole._id);
        const objUser = {
          ...user.toObject(),
          permissions: temp?.permissions ?? [],
        };
        return objUser;
      }
    }
    return null;
  }

  async login(user: IUser, response: Response) {
    const { _id, name, email, role, permissions, avatar, coverPhoto, block } =
      user;
    const payload = {
      sub: 'token login',
      iss: 'from server',
      _id,
      name,
      email,
      role,
      avatar,
      coverPhoto,
      block,
    };
    const refresh_token = this.createRefreshToken(payload);
    //update token with refresh token
    await this.usersService.updateUserToken(refresh_token, _id);
    //set refresh_token as cookies
    response.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      maxAge: ms(this.configService.get<string>('JWT_REFRESH_EXPIRE')),
    });
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        _id,
        name,
        email,
        role,
        permissions,
        online: true,
        lastActive: new Date(),
        avatar,
        coverPhoto,
        block,
      },
    };
  }

  // auth.service.ts
  async loginMedia(type: string, username: string, response: Response) {
    let user: any = await this.usersService.findOneByUserNameAndType(
      username,
      type,
    );

    // Nếu user chưa có -> tạo
    if (!user) {
      await this.usersService.registerMedia(type, username);
      user = await this.usersService.findOneByUserNameAndType(username, type);
      console.log(user?._id, user?.type);
    }
    console.log(user?._id, user?.type);
    return this.handleLoginToken(user, response); // user kiểu any cũng được
  }

  private async handleLoginToken(user: any, response: Response) {
    const payload = {
      sub: 'token login',
      iss: 'from server',
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role, // Đã FIX: Không còn gán sai = email
      type: user.type,
    };

    const refresh_token = this.createRefreshToken(payload);
    await this.usersService.updateUserToken(refresh_token, user._id);

    // Set cookie
    response.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      maxAge: ms(this.configService.get<string>('JWT_REFRESH_EXPIRE')),
    });

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        type: user.type,
        online: true,
        lastActive: new Date(),
      },
    };
  }

  async register(registerUserDto: RegisterUserDto) {
    let newUser = await this.usersService.register(registerUserDto);
    return {
      _id: newUser?._id,
      createdAt: newUser?.createdAt,
    };
  }

  createRefreshToken = (payload: any) => {
    const refresh_token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn:
        ms(this.configService.get<string>('JWT_REFRESH_EXPIRE')) / 1000,
    });
    return refresh_token;
  };

  processNewToken = async (refreshtoken: string, response: Response) => {
    try {
      this.jwtService.verify(refreshtoken, {
        secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      });
      let user = await this.usersService.findUserByUser(refreshtoken);
      if (user) {
        //update refresh token
        const { _id, name, email, role } = user;
        const payload = {
          sub: 'token refresh',
          iss: 'from server',
          _id,
          name,
          email,
          role,
        };
        const refresh_token = this.createRefreshToken(payload);
        //update token with refresh token
        await this.usersService.updateUserToken(refresh_token, _id.toString());
        const userRole = user.role as unknown as { _id: string; name: string };
        const temp = await this.roleService.findOne(userRole._id);
        //set refresh_token as cookies
        response.clearCookie('refresh_token');
        response.cookie('refresh_token', refresh_token, {
          httpOnly: true,
          maxAge: ms(this.configService.get<string>('JWT_REFRESH_EXPIRE')),
        });
        return {
          access_token: this.jwtService.sign(payload),
          user: {
            _id,
            name,
            email,
            role,
            permissions: temp?.permissions ?? [],
          },
        };
      } else {
        throw new BadRequestException(
          'Refresh token không hợp lệ vui lòng login',
        );
      }
    } catch (error) {
      throw new BadRequestException(
        'Refresh token không hợp lệ vui lòng login',
      );
    }
  };

  logout = async (response: Response, user: IUser) => {
    await this.usersService.updateUserToken('', user._id);
    response.clearCookie('refresh_token');
    return 'ok';
  };
}

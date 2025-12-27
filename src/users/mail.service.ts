import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_AUTH_USER'),
        pass: this.configService.get<string>('EMAIL_AUTH_PASS'),
      },
    });
  }

  async sendResetPasswordMail(email: string, resetLink: string) {
    await this.transporter.sendMail({
      from: `"Social Network" <${this.configService.get('EMAIL_AUTH_USER')}>`,
      to: email,
      subject: 'Đặt lại mật khẩu',
      html: `
        <h3>Yêu cầu đặt lại mật khẩu</h3>
        <p>Bạn vừa yêu cầu đặt lại mật khẩu.</p>
        <p>Click vào link dưới đây:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p><b>Link chỉ có hiệu lực trong 15 phút.</b></p>
      `,
    });
  }
}

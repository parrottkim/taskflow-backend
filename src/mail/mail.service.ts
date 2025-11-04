import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import config from 'config';
import { google } from 'googleapis';
import { UserService } from 'src/user/user.service';

@Injectable()
export class MailService {
  private oAuth2Client;

  constructor(
    @Inject(config.KEY)
    private configService: ConfigType<typeof config>,
    private userService: UserService,
  ) {
    this.oAuth2Client = new google.auth.OAuth2(
      this.configService.mail.clientId,
      this.configService.mail.clientSecret,
    );

    this.oAuth2Client.setCredentials({
      refresh_token: this.configService.mail.refreshToken,
    });
  }

  private encodeMessage(message: string): string {
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async sendMailToEveryone(subject: string, content: string) {
    const users = await this.userService.getAllUsers();

    const toRecipients = users
      .map((user) => {
        const name = `=?UTF-8?B?${Buffer.from(
          `${user.username} ${user.position.name}`,
          'utf-8',
        ).toString('base64')}?=`;
        return `${name} <${user.email}>`;
      })
      .join(', ');

    const gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });

    const subjectBase64 = Buffer.from(subject, 'utf-8').toString('base64');
    const formattedSubject = `=?UTF-8?B?${subjectBase64}?=`;

    const message = [
      `From: "taskflow-helpbot" <${this.configService.mail.user}>`,
      `To: ${toRecipients}`,
      `Subject: ${formattedSubject}`,
      'MIME-Version: 1.0',
      `Content-Type: text/plain; charset="UTF-8"`,
      '',
      content,
    ].join('\r\n');

    const encodedMessage = this.encodeMessage(message);

    try {
      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });
      console.log('✅ 이메일 전송 성공:', res.data);
      return res.data;
    } catch (err) {
      console.error('❌ 이메일 전송 실패:', err);
      throw new Error('이메일 전송 중 오류가 발생했습니다.');
    }
  }
}

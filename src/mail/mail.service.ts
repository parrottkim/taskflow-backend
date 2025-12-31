import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import config from 'config';
import { google } from 'googleapis';
import { marked } from 'marked';
import { IssueDto } from 'src/issue/dto/issue';
import { IssueAttachmentDto } from 'src/issue/dto/issue-attachment';
import { ProjectDto } from 'src/project/dto/project';
import { ReportDto } from 'src/report/dto/report';
import { ReportAttachmentDto } from 'src/report/dto/report-attachment';
import { ScheduleDto } from 'src/schedule/dto/schedule';
import { UserService } from 'src/user/user.service';
import * as dayjs from 'dayjs';

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

  private readonly allowedDomain = 'dan-tech.com';

  private isAllowedEmail(email: string): boolean {
    if (!email) return false;
    return email.toLowerCase().endsWith(`@${this.allowedDomain}`);
  }

  private encodeMessage(message: string): string {
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /** -------------------------
   *  📌 공통: MIME 메시지 생성
   * -------------------------- */
  private buildMimeMessage({
    from,
    to,
    subject,
    html,
  }: {
    from: string;
    to: string;
    subject: string;
    html: string;
  }): string {
    const subjectBase64 = Buffer.from(subject, 'utf-8').toString('base64');
    const formattedSubject = `=?UTF-8?B?${subjectBase64}?=`;

    return [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${formattedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset="UTF-8"',
      '',
      html,
    ].join('\r\n');
  }

  /** -------------------------
   *  📌 공통: Gmail 전송
   * -------------------------- */
  private async sendEmail(message: string) {
    const gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });
    const encodedMessage = this.encodeMessage(message);

    return await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });
  }

  private getResetPasswordHtml(resetLink: string): string {
    return `
    <!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>비밀번호 재설정</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Helvetica Neue', Arial, sans-serif;">
        <div style="max-width:600px;margin:40px auto;background-color:#fff;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,0.1);overflow:hidden;">
          <div style="padding:40px 30px;text-align:center;">
            <img src="http://cdn.dan-tech.com/files/images/icon-192.png" alt="Taskflow 로고" style="width:50px;height:50px;margin-bottom:25px;">
            <h1 style="font-size:24px;font-weight:700;color:#111827;margin-bottom:20px;">비밀번호 재설정 요청</h1>
            <p style="font-size:16px;color:#4b5563;line-height:1.6;margin-bottom:35px;"> 요청하신 계정의 비밀번호를 재설정하려면 아래 버튼을 클릭해 주세요. <br> 링크는 보안을 위해 <span style="color:#e11d48;font-weight:bold;">10분 동안만 유효</span>합니다. </p>
            <a href="${resetLink}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:16px;color:#ffffff;background-color:#78909C;border-radius:8px;text-decoration:none;font-weight:600;">비밀번호 재설정</a>
            <p style="font-size:14px;color:#6b7280;line-height:1.5;margin-top:30px;"> 본인이 요청하지 않은 경우, 이 이메일을 무시하셔도 됩니다. </p>
          </div>
        </div>
      </body>
    </html>
    `;
  }

  private getScheduleMailHtml(
    summary: string,
    start: string,
    end: string,
    categoryName: string,
    clientName: string,
    projectName: string,
    username: string,
    userEmail: string,
    description: string,
    url: string,
  ): string {
    return `
    <!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>새 일정 등록</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Helvetica Neue', Arial, sans-serif;">
        <div style="max-width:600px;margin:40px auto;background-color:#fff;border-radius:10px;box-shadow:0 6px 18px rgba(0, 0, 0, 0.1);overflow:hidden;padding:40px 30px;">
          <img style="width:50px;height:50px;margin-bottom:25px;display:block;margin-left:auto;margin-right:auto;" src="http://cdn.dan-tech.com/files/images/icon-192.png" alt="Taskflow 로고">
          <h1 style="font-size:24px;font-weight:700;color:#111827;margin-bottom:20px;text-align:center;">🗓️ 새로운 일정 등록</h1>
          <div style="font-size:20px;font-weight:600;color:#78909C;margin-bottom:30px;text-align:center;padding:10px 0;border-bottom:1px solid #e5e7eb;">${summary}</div>
          <div style="display:block;margin-bottom:30px;">
            <div style="width:100%;padding:15px;box-sizing:border-box;margin-top:20px;border:1px solid #f0f2f5;border-radius:8px;background-color:#f9fafb;text-align:left;">
              <strong style="display:block;font-size:16px;color:#111827;margin-bottom:10px;">일정 정보</strong>
              <br>
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr>
                  <th style="width:30%;padding:5px 10px 5px 0;text-align:left;vertical-align:top;color:#4b5563;font-weight:600;">기간</th>
                  <td style="width:70%;padding:5px 0;text-align:left;vertical-align:top;color:#111827;line-height:1.4;">${start} ~ ${end}</td>
                </tr>
                <tr>
                  <th style="width:30%;padding:5px 10px 5px 0;text-align:left;vertical-align:top;color:#4b5563;font-weight:600;">카테고리</th>
                  <td style="width:70%;padding:5px 0;text-align:left;vertical-align:top;color:#111827;line-height:1.4;">${categoryName}</td>
                </tr>
                <tr>
                  <th style="width:30%;padding:5px 10px 5px 0;text-align:left;vertical-align:top;color:#4b5563;font-weight:600;">고객사</th>
                  <td style="width:70%;padding:5px 0;text-align:left;vertical-align:top;color:#111827;line-height:1.4;">${clientName}</td>
                </tr>
                <tr>
                  <th style="width:30%;padding:5px 10px 5px 0;text-align:left;vertical-align:top;color:#4b5563;font-weight:600;">프로젝트</th>
                  <td style="width:70%;padding:5px 0;text-align:left;vertical-align:top;color:#111827;line-height:1.4;">${projectName}</td>
                </tr>
                <tr>
                  <th style="width:30%;padding:5px 10px 5px 0;text-align:left;vertical-align:top;color:#4b5563;font-weight:600;">작성자</th>
                  <td style="width:70%;padding:5px 0;text-align:left;vertical-align:top;color:#111827;line-height:1.4;">${username} (<a href="mailto:${userEmail}" style="color:#78909C;text-decoration:none;">${userEmail}</a>)</td>
                </tr>
              </table>
            </div>
            <div style="width:100%;padding:15px;box-sizing:border-box;margin-top:20px;border:1px solid #f0f2f5;border-radius:8px;background-color:#f9fafb;text-align:left;">
              <strong style="display:block;font-size:16px;color:#111827;margin-bottom:10px;">상세 내용</strong>
              <br>
              <br>${description.replace(/\n/g, '<br>')}
            </div>
          </div>
          <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:16px;color:#ffffff;background-color:#78909C;border-radius:8px;text-decoration:none;font-weight:600;transition:opacity 0.3s;width:100%;text-align:center;box-sizing:border-box;margin-top:20px;" target="_blank">프로젝트 바로가기</a>
        </div>
      </body>
    </html>
    `;
  }

  private getIssueMailHtml(
    categoryName: string,
    clientName: string,
    projectCode: string,
    projectName: string,
    username: string,
    userEmail: string,
    content: string,
    url: string,
    attachments: IssueAttachmentDto[],
    managerName?: string,
    managerEmail?: string,
  ) {
    const managerDisplay =
      managerName && managerEmail
        ? `${managerName} (<a href="mailto:${managerEmail}" style="color:#78909C;text-decoration:none;">${managerEmail}</a>)`
        : 'PM 없음';

    const processedContent = content.replace(/\n/g, '<br>');

    const frontendUrl = this.configService.frontend.url;

    let attachmentsHtml = '';
    if (attachments.length > 0) {
      const listItems = attachments
        .map(
          (att) => `
        <tr>
          <td style="padding:3px 0;border-bottom:1px dotted #e5e7eb;">
            <a href="${frontendUrl}/download?path=${att.path}&filename=${att.filename}" target="_blank" style="color:#78909C;text-decoration:none;">
              ${att.filename}
            </a>
          </td>
        </tr>
      `,
        )
        .join('');

      attachmentsHtml = `
        <div style="width:100%;padding:15px;box-sizing:border-box;margin-top:20px;border:1px solid #f0f2f5;border-radius:8px;background-color:#f9fafb;text-align:left;">
          <strong style="display:block;font-size:16px;color:#111827;margin-bottom:10px;">첨부 파일 (${attachments.length}개)</strong>
          <br>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            ${listItems}
          </table>
        </div>
      `;
    }

    return `<!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>업무 내용 공유</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Helvetica Neue', Arial, sans-serif;">
        <div style="max-width:600px;margin:40px auto;background-color:#fff;border-radius:10px;box-shadow:0 6px 18px rgba(0, 0, 0, 0.1);overflow:hidden;padding:40px 30px;">
          <img style="width:50px;height:50px;margin-bottom:25px;display:block;margin-left:auto;margin-right:auto;" src="http://cdn.dan-tech.com/files/images/icon-192.png" alt="Taskflow 로고">
          <h1 style="font-size:24px;font-weight:700;color:#111827;margin-bottom:20px;text-align:center;">💻️ 업무 내용 공유</h1>
          <div style="display:block;margin-bottom:30px;">
            <div style="width:100%;padding:15px;box-sizing:border-box;margin-top:20px;border:1px solid #f0f2f5;border-radius:8px;background-color:#f9fafb;text-align:left;">
              <strong style="display:block;font-size:16px;color:#111827;margin-bottom:10px;">프로젝트 정보</strong>
              <br>
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr>
                  <th style="width:30%;padding:5px 10px 5px 0;text-align:left;vertical-align:top;color:#4b5563;font-weight:600;">카테고리</th>
                  <td style="width:70%;padding:5px 0;text-align:left;vertical-align:top;color:#111827;line-height:1.4;">${categoryName}</td>
                </tr>
                <tr>
                  <th style="width:30%;padding:5px 10px 5px 0;text-align:left;vertical-align:top;color:#4b5563;font-weight:600;">고객사</th>
                  <td style="width:70%;padding:5px 0;text-align:left;vertical-align:top;color:#111827;line-height:1.4;">${clientName}</td>
                </tr>
                <tr>
                  <th style="width:30%;padding:5px 10px 5px 0;text-align:left;vertical-align:top;color:#4b5563;font-weight:600;">프로젝트 코드</th>
                  <td style="width:70%;padding:5px 0;text-align:left;vertical-align:top;color:#111827;line-height:1.4;">${projectCode}</td>
                </tr>
                <tr>
                  <th style="width:30%;padding:5px 10px 5px 0;text-align:left;vertical-align:top;color:#4b5563;font-weight:600;">프로젝트 명</th>
                  <td style="width:70%;padding:5px 0;text-align:left;vertical-align:top;color:#111827;line-height:1.4;">${projectName}</td>
                </tr>
                <tr>
                  <th style="width:30%;padding:5px 10px 5px 0;text-align:left;vertical-align:top;color:#4b5563;font-weight:600;">작성자</th>
                  <td style="width:70%;padding:5px 0;text-align:left;vertical-align:top;color:#111827;line-height:1.4;">${username} (<a href="mailto:${userEmail}" style="color:#78909C;text-decoration:none;">${userEmail}</a>)</td>
                </tr>
                <tr>
                  <th style="width:30%;padding:5px 10px 5px 0;text-align:left;vertical-align:top;color:#4b5563;font-weight:600;">PM</th>
                  <td style="width:70%;padding:5px 0;text-align:left;vertical-align:top;color:#111827;line-height:1.4;">${managerDisplay}</td>
                </tr>
              </table>
            </div>
            <div style="width:100%;padding:15px;box-sizing:border-box;margin-top:20px;border:1px solid #f0f2f5;border-radius:8px;background-color:#f9fafb;text-align:left;">
              <strong style="display:block;font-size:16px;color:#111827;margin-bottom:10px;">업무 내용</strong>
              <br>
              ${processedContent}
            </div>
          </div>

          ${attachmentsHtml}

          <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:16px;color:#ffffff;background-color:#78909C;border-radius:8px;text-decoration:none;font-weight:600;transition:opacity 0.3s;width:100%;text-align:center;box-sizing:border-box;margin-top:20px;" target="_blank">프로젝트 바로가기</a>
        </div>
      </body>
    </html>`;
  }

  private getReportMailHtml(
    categoryName: string,
    clientName: string,
    projectCode: string,
    projectName: string,
    username: string,
    userEmail: string,
    content: string,
    url: string,
    attachments: ReportAttachmentDto[],
    managerName?: string,
    managerEmail?: string,
  ) {
    const managerDisplay =
      managerName && managerEmail
        ? `${managerName} (<a href="mailto:${managerEmail}" style="color:#78909C;text-decoration:none;">${managerEmail}</a>)`
        : 'PM 없음';

    const processedContent = content.replace(/\n/g, '<br>');

    const frontendUrl = this.configService.frontend.url;

    let attachmentsHtml = '';
    if (attachments.length > 0) {
      const listItems = attachments
        .map(
          (att) => `
        <tr>
          <td style="padding:3px 0;border-bottom:1px dotted #e5e7eb;">
            <a href="${frontendUrl}/download?path=${att.path}&filename=${att.filename}" target="_blank" style="color:#78909C;text-decoration:none;">
              ${att.filename}
            </a>
          </td>
        </tr>
      `,
        )
        .join('');

      attachmentsHtml = `
        <div style="width:100%;padding:15px;box-sizing:border-box;margin-top:20px;border:1px solid #f0f2f5;border-radius:8px;background-color:#f9fafb;text-align:left;">
          <strong style="display:block;font-size:16px;color:#111827;margin-bottom:10px;">첨부 파일 (${attachments.length}개)</strong>
          <br>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            ${listItems}
          </table>
        </div>
      `;
    }

    return `<!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>실무 결과 공유</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Helvetica Neue', Arial, sans-serif;">
        <div style="max-width:600px;margin:40px auto;background-color:#fff;border-radius:10px;box-shadow:0 6px 18px rgba(0, 0, 0, 0.1);overflow:hidden;padding:40px 30px;">
          <img style="width:50px;height:50px;margin-bottom:25px;display:block;margin-left:auto;margin-right:auto;" src="http://cdn.dan-tech.com/files/images/icon-192.png" alt="Taskflow 로고">
          <h1 style="font-size:24px;font-weight:700;color:#111827;margin-bottom:20px;text-align:center;">✈️️ 실무 결과 공유</h1>
          <div style="display:block;margin-bottom:30px;">
            <div style="width:100%;padding:15px;box-sizing:border-box;margin-top:20px;border:1px solid #f0f2f5;border-radius:8px;background-color:#f9fafb;text-align:left;">
              <strong style="display:block;font-size:16px;color:#111827;margin-bottom:10px;">프로젝트 정보</strong>
              <br>
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr>
                  <th style="width:30%;padding:5px 10px 5px 0;text-align:left;vertical-align:top;color:#4b5563;font-weight:600;">카테고리</th>
                  <td style="width:70%;padding:5px 0;text-align:left;vertical-align:top;color:#111827;line-height:1.4;">${categoryName}</td>
                </tr>
                <tr>
                  <th style="width:30%;padding:5px 10px 5px 0;text-align:left;vertical-align:top;color:#4b5563;font-weight:600;">고객사</th>
                  <td style="width:70%;padding:5px 0;text-align:left;vertical-align:top;color:#111827;line-height:1.4;">${clientName}</td>
                </tr>
                <tr>
                  <th style="width:30%;padding:5px 10px 5px 0;text-align:left;vertical-align:top;color:#4b5563;font-weight:600;">프로젝트 코드</th>
                  <td style="width:70%;padding:5px 0;text-align:left;vertical-align:top;color:#111827;line-height:1.4;">${projectCode}</td>
                </tr>
                <tr>
                  <th style="width:30%;padding:5px 10px 5px 0;text-align:left;vertical-align:top;color:#4b5563;font-weight:600;">프로젝트 명</th>
                  <td style="width:70%;padding:5px 0;text-align:left;vertical-align:top;color:#111827;line-height:1.4;">${projectName}</td>
                </tr>
                <tr>
                  <th style="width:30%;padding:5px 10px 5px 0;text-align:left;vertical-align:top;color:#4b5563;font-weight:600;">작성자</th>
                  <td style="width:70%;padding:5px 0;text-align:left;vertical-align:top;color:#111827;line-height:1.4;">${username} (<a href="mailto:${userEmail}" style="color:#78909C;text-decoration:none;">${userEmail}</a>)</td>
                </tr>
                <tr>
                  <th style="width:30%;padding:5px 10px 5px 0;text-align:left;vertical-align:top;color:#4b5563;font-weight:600;">PM</th>
                  <td style="width:70%;padding:5px 0;text-align:left;vertical-align:top;color:#111827;line-height:1.4;">${managerDisplay}</td>
                </tr>
              </table>
            </div>
            <div style="width:100%;padding:15px;box-sizing:border-box;margin-top:20px;border:1px solid #f0f2f5;border-radius:8px;background-color:#f9fafb;text-align:left;">
              <strong style="display:block;font-size:16px;color:#111827;margin-bottom:10px;">실무 내용</strong>
              <br>
              <div style="margin-top:10px;line-height:1.6;color:#111827;">
                ${processedContent}
              </div>
            </div>
            
            ${attachmentsHtml}

          </div>
          <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:16px;color:#ffffff;background-color:#78909C;border-radius:8px;text-decoration:none;font-weight:600;transition:opacity 0.3s;width:100%;text-align:center;box-sizing:border-box;margin-top:20px;" target="_blank">프로젝트 바로가기</a>
        </div>
      </body>
    </html>`;
  }

  async sendResetPassword(email: string, resetToken: string) {
    const subject = 'Taskflow 비밀번호 재설정 요청 확인 및 안내';
    const frontendUrl = this.configService.frontend.url;
    const resetLink = `${frontendUrl}/login/reset-password?token=${resetToken}`;
    const html = this.getResetPasswordHtml(resetLink);

    const message = this.buildMimeMessage({
      from: `"taskflow-helpbot" <${this.configService.mail.user}>`,
      to: email,
      subject,
      html,
    });

    return await this.sendEmail(message);
  }

  async sendScheduleMail(project: ProjectDto, schedule: ScheduleDto) {
    const users = await this.userService.getAllUsers();
    const allowedUsers = users.filter((u) => this.isAllowedEmail(u.email));
    if (!allowedUsers.length) return null;

    const toRecipients = allowedUsers
      .map((user) => {
        const name = `=?UTF-8?B?${Buffer.from(
          `${user.username} ${user.position.name}`,
          'utf-8',
        ).toString('base64')}?=`;
        return `${name} <${user.email}>`;
      })
      .join(', ');

    const client = `${project.clients[0].name} ${project.clients[project.clients.length - 1].name}`;

    const frontendUrl = this.configService.frontend.url; // 설정 구조에 따라 변경 필요
    const url = `${frontendUrl}/project/${project.id}`;

    const subject = `🗓️ [${schedule.category.name}][${project.clients[project.clients.length - 1].name}][${schedule.user.username}] ${schedule.summary}`;
    const html = this.getScheduleMailHtml(
      schedule.summary,
      dayjs(schedule.start).format('YYYY-MM-DD'),
      dayjs(schedule.end).format('YYYY-MM-DD'),
      schedule.category.name,
      client,
      project.name,
      schedule.user.username,
      schedule.user.email,
      schedule.description,
      url,
    );

    const message = this.buildMimeMessage({
      from: `"taskflow-helpbot" <${this.configService.mail.user}>`,
      to: toRecipients,
      subject,
      html,
    });

    return await this.sendEmail(message);
  }

  async sendIssueMail(project: ProjectDto, issue: IssueDto) {
    const users = await this.userService.getAllUsers();
    const allowedUsers = users.filter((u) => this.isAllowedEmail(u.email));
    if (!allowedUsers.length) return null;

    const toRecipients = allowedUsers
      .map((user) => {
        const name = `=?UTF-8?B?${Buffer.from(
          `${user.username} ${user.position.name}`,
          'utf-8',
        ).toString('base64')}?=`;
        return `${name} <${user.email}>`;
      })
      .join(', ');

    const client = `${project.clients[0].name} ${project.clients[project.clients.length - 1].name}`;
    const content = await marked(issue.content);

    const frontendUrl = this.configService.frontend.url; // 설정 구조에 따라 변경 필요
    const url = `${frontendUrl}/project/${project.id}?view=issue&issue=${issue.id}`;

    const subject = `💻️ [${issue.category.name}][${project.clients[0].name}][${project.clients[project.clients.length - 1].name}] ${project.name}`;
    const html = this.getIssueMailHtml(
      issue.category.name,
      client,
      project.code,
      project.name,
      issue.user.username,
      issue.user.email,
      content,
      url,
      issue.attachments,
      project.manager?.username,
      project.manager?.email,
    );

    const message = this.buildMimeMessage({
      from: `"taskflow-helpbot" <${this.configService.mail.user}>`,
      to: toRecipients,
      subject,
      html,
    });

    return await this.sendEmail(message);
  }

  async sendReportMail(project: ProjectDto, report: ReportDto) {
    const users = await this.userService.getAllUsers();
    const allowedUsers = users.filter((u) => this.isAllowedEmail(u.email));
    if (!allowedUsers.length) return null;

    const toRecipients = allowedUsers
      .map((user) => {
        const name = `=?UTF-8?B?${Buffer.from(
          `${user.username} ${user.position.name}`,
          'utf-8',
        ).toString('base64')}?=`;
        return `${name} <${user.email}>`;
      })
      .join(', ');

    const client = `${project.clients[0].name} ${project.clients[project.clients.length - 1].name}`;
    const content = await marked(report.content);

    const frontendUrl = this.configService.frontend.url; // 설정 구조에 따라 변경 필요
    const url = `${frontendUrl}/project/${project.id}?view=report&report=${report.id}`;

    const subject = `✈️ [${report.schedule.category.name}][${project.clients[0].name}][${project.clients[project.clients.length - 1].name}] ${project.name}`;
    const html = this.getReportMailHtml(
      report.schedule.category.name,
      client,
      project.code,
      project.name,
      report.user.username,
      report.user.email,
      content,
      url,
      report.attachments,
      project.manager?.username,
      project.manager?.email,
    );

    const message = this.buildMimeMessage({
      from: `"taskflow-helpbot" <${this.configService.mail.user}>`,
      to: toRecipients,
      subject,
      html,
    });

    return await this.sendEmail(message);
  }
}

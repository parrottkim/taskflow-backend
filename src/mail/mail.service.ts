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
import { UserDto } from 'src/user/dto/user';
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
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #f0f2f5;
            font-family: 'Helvetica Neue', Arial, sans-serif;
          }

          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #fff;
            border-radius: 10px;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }

          .content {
            padding: 40px 30px;
            text-align: center;
          }

          .logo {
            width: 50px;
            height: 50px;
            margin-bottom: 25px;
          }

          h1 {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 20px;
          }

          p {
            font-size: 16px;
            color: #4b5563;
            line-height: 1.6;
            margin-bottom: 35px;
          }

          .highlight {
            color: #e11d48;
            font-weight: bold;
          }

          .btn {
            display: inline-block;
            padding: 14px 28px;
            font-size: 16px;
            color: #ffffff;
            background-color: #78909C;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: opacity 0.3s;
          }

          .btn:hover {
            opacity: 0.85;
          }

          .note {
            font-size: 14px;
            color: #6b7280;
            line-height: 1.5;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <img src="http://cdn.dan-tech.com/files/images/icon-192.png" alt="Taskflow 로고" class="logo">
            <h1>비밀번호 재설정 요청</h1>
            <p> 요청하신 계정의 비밀번호를 재설정하려면 아래 버튼을 클릭해 주세요. <br> 링크는 보안을 위해 <span class="highlight">10분 동안만 유효</span>합니다. </p>
            <a href="${resetLink}" target="_blank" class="btn">비밀번호 재설정</a>
            <p class="note"> 본인이 요청하지 않은 경우, 이 이메일을 무시하셔도 됩니다. </p>
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
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #f0f2f5;
            font-family: 'Helvetica Neue', Arial, sans-serif;
          }

          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #fff;
            border-radius: 10px;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            padding: 40px 30px;
          }

          /* 💡 컨테이너에 패딩 추가 */
          .logo {
            width: 50px;
            height: 50px;
            margin-bottom: 25px;
            display: block;
            margin-left: auto;
            margin-right: auto;
          }

          h1 {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 20px;
            text-align: center;
          }

          /* 💡 새로운 스타일 추가 */
          .title {
            font-size: 20px;
            font-weight: 600;
            color: #78909C;
            margin-bottom: 30px;
            text-align: center;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }

          .grid {
            display: block;
            /* 이메일 클라이언트 호환성을 위해 flex/grid 대신 block 사용 권장 */
            margin-bottom: 30px;
          }

          .box {
            width: 100%;
            padding: 15px;
            box-sizing: border-box;
            margin-top: 20px;
            border: 1px solid #f0f2f5;
            border-radius: 8px;
            background-color: #f9fafb;
            text-align: left;
          }

          .box strong {
            display: block;
            font-size: 16px;
            color: #111827;
            margin-bottom: 10px;
          }

          /* 테이블 스타일 */
          .box table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          }

          .box th,
          .box td {
            padding: 5px 0;
            text-align: left;
            vertical-align: top;
          }

          .box th {
            width: 30%;
            color: #4b5563;
            font-weight: 600;
            padding-right: 10px;
          }

          .box td {
            width: 70%;
            color: #111827;
            line-height: 1.4;
          }

          .btn {
            display: inline-block;
            padding: 14px 28px;
            font-size: 16px;
            color: #ffffff;
            background-color: #78909C;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: opacity 0.3s;
            width: 100%;
            text-align: center;
            box-sizing: border-box;
            margin-top: 20px;
          }

          .btn:hover {
            opacity: 0.85;
          }
        </style>
      </head>
      <body>
        <div class="container">
            
          <img class="logo" src="http://cdn.dan-tech.com/files/images/icon-192.png" alt="Taskflow 로고">
          <h1>🗓️ 새로운 일정 등록</h1>
          <div class="title">${summary}</div>
          <div class="grid">
            <div class="box">
              <strong>일정 정보</strong>
              <br>
              <table>
                <tr>
                  <th>기간</th>
                  <td>${start} ~ ${end}</td>
                </tr>
                <tr>
                  <th>카테고리</th>
                  <td>${categoryName}</td>
                </tr>
                <tr>
                  <th>고객사</th>
                  <td>${clientName}</td>
                </tr>
                <tr>
                  <th>프로젝트</th>
                  <td>${projectName}</td>
                </tr>
                <tr>
                  <th>작성자</th>
                  <td> ${username} (<a href="mailto:${userEmail}" style="color: #78909C; text-decoration: none;">${userEmail}</a>) </td>
                </tr>
              </table>
            </div>
            <div class="box">
              <strong>상세 내용</strong>
              <br>
              <br> ${description.replace(/\n/g, ' <br>')}
            </div>
          </div>
          <a href="${url}" class="btn" target="_blank">프로젝트 바로가기</a>
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
        ? `${managerName} (<a href="mailto:${managerEmail}" style="color: #78909C; text-decoration: none;">${managerEmail}</a>)`
        : 'PM 없음';

    const processedContent = content.replace(/\n/g, '<br>');

    const frontendUrl = this.configService.frontend.url;

    let attachmentsHtml = '';
    if (attachments.length > 0) {
      const listItems = attachments
        .map(
          (att) => `
        <tr>
          <td>
            <a href="${frontendUrl}/download?path=${att.path}&filename=${att.filename}" target="_blank" style="color: #78909C; text-decoration: none;">
              ${att.filename}
            </a>
          </td>
        </tr>
      `,
        )
        .join('');

      attachmentsHtml = `
        <div class="box">
          <strong>첨부 파일 (${attachments.length}개)</strong>
          <br>
          <table class="attachment-list">
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
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #f0f2f5;
            font-family: 'Helvetica Neue', Arial, sans-serif;
          }

          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #fff;
            border-radius: 10px;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            padding: 40px 30px;
          }

          /* 💡 컨테이너에 패딩 추가 */
          .logo {
            width: 50px;
            height: 50px;
            margin-bottom: 25px;
            display: block;
            margin-left: auto;
            margin-right: auto;
          }

          h1 {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 20px;
            text-align: center;
          }

          /* 💡 새로운 스타일 추가 */
          .title {
            font-size: 20px;
            font-weight: 600;
            color: #78909C;
            margin-bottom: 30px;
            text-align: center;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }

          .grid {
            display: block;
            /* 이메일 클라이언트 호환성을 위해 flex/grid 대신 block 사용 권장 */
            margin-bottom: 30px;
          }

          .box {
            width: 100%;
            padding: 15px;
            box-sizing: border-box;
            margin-top: 20px;
            border: 1px solid #f0f2f5;
            border-radius: 8px;
            background-color: #f9fafb;
            text-align: left;
          }

          .box strong {
            display: block;
            font-size: 16px;
            color: #111827;
            margin-bottom: 10px;
          }

          /* 테이블 스타일 */
          .box table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          }

          .box th,
          .box td {
            padding: 5px 0;
            text-align: left;
            vertical-align: top;
          }

          .box th {
            width: 30%;
            color: #4b5563;
            font-weight: 600;
            padding-right: 10px;
          }

          .box td {
            width: 70%;
            color: #111827;
            line-height: 1.4;
          }

          .btn {
            display: inline-block;
            padding: 14px 28px;
            font-size: 16px;
            color: #ffffff;
            background-color: #78909C;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: opacity 0.3s;
            width: 100%;
            text-align: center;
            box-sizing: border-box;
            margin-top: 20px;
          }

          .btn:hover {
            opacity: 0.85;
          }
        </style>
      </head>
      <body>
        <div class="container">
            
          <img class="logo" src="http://cdn.dan-tech.com/files/images/icon-192.png" alt="Taskflow 로고">
          <h1>💻️ 업무 내용 공유</h1>
          <div class="grid">
            <div class="box">
              <strong>프로젝트 정보</strong>
              <br>
              <table>
                <tr>
                  <th>카테고리</th>
                  <td>${categoryName}</td>
                </tr>
                <tr>
                  <th>고객사</th>
                  <td>${clientName}</td>
                </tr>
                <tr>
                  <th>프로젝트 코드</th>
                  <td>${projectCode}</td>
                </tr>
                <tr>
                  <th>프로젝트 명</th>
                  <td>${projectName}</td>
                </tr>
                <tr>
                  <th>작성자</th>
                  <td> ${username} (<a href="mailto:${userEmail}" style="color: #78909C; text-decoration: none;">${userEmail}</a>) </td>
                </tr>
                <tr>
                  <th>PM</th>
                  <td> ${managerDisplay} </td>
                </tr>
              </table>
            </div>
            <div class="box">
              <strong>업무 내용</strong>
              <br>
              ${processedContent}
            </div>
          </div>

          ${attachmentsHtml}

          <a href="${url}" class="btn" target="_blank">프로젝트 바로가기</a>
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
        ? `${managerName} (<a href="mailto:${managerEmail}" style="color: #78909C; text-decoration: none;">${managerEmail}</a>)`
        : 'PM 없음';

    const processedContent = content.replace(/\n/g, '<br>');

    const frontendUrl = this.configService.frontend.url;

    let attachmentsHtml = '';
    if (attachments.length > 0) {
      const listItems = attachments
        .map(
          (att) => `
        <tr>
          <td>
            <a href="${frontendUrl}/download?path=${att.path}&filename=${att.filename}" target="_blank" style="color: #78909C; text-decoration: none;">
              ${att.filename}
            </a>
          </td>
        </tr>
      `,
        )
        .join('');

      // 첨부파일 박스 전체 HTML 구조
      attachmentsHtml = `
        <div class="box">
          <strong>첨부 파일 (${attachments.length}개)</strong>
          <br>
          <table class="attachment-list">
            ${listItems}
          </table>
        </div>
      `;
    }

    // 4. 최종 HTML 템플릿 반환
    return `<!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>실무 결과 공유</title>
        <style>
          /* (기존 CSS 스타일은 유지) */
          body {
            margin: 0;
            padding: 0;
            background-color: #f0f2f5;
            font-family: 'Helvetica Neue', Arial, sans-serif;
          }

          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #fff;
            border-radius: 10px;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            padding: 40px 30px;
          }

          .logo {
            width: 50px;
            height: 50px;
            margin-bottom: 25px;
            display: block;
            margin-left: auto;
            margin-right: auto;
          }

          h1 {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 20px;
            text-align: center;
          }

          .title {
            font-size: 20px;
            font-weight: 600;
            color: #78909C;
            margin-bottom: 30px;
            text-align: center;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }

          .grid {
            display: block;
            margin-bottom: 30px;
          }

          .box {
            width: 100%;
            padding: 15px;
            box-sizing: border-box;
            margin-top: 20px;
            border: 1px solid #f0f2f5;
            border-radius: 8px;
            background-color: #f9fafb;
            text-align: left;
          }

          .box strong {
            display: block;
            font-size: 16px;
            color: #111827;
            margin-bottom: 10px;
          }

          /* 테이블 스타일 */
          .box table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          }

          .box th,
          .box td {
            padding: 5px 0;
            text-align: left;
            vertical-align: top;
          }
          
          /* 💡 첨부 파일 목록 스타일 추가 */
          .attachment-list td {
            padding: 3px 0;
            border-bottom: 1px dotted #e5e7eb; /* 파일 구분선 */
          }
          .attachment-list tr:last-child td {
            border-bottom: none;
          }
          
          .box th {
            width: 30%;
            color: #4b5563;
            font-weight: 600;
            padding-right: 10px;
          }

          .box td {
            width: 70%;
            color: #111827;
            line-height: 1.4;
          }

          .btn {
            display: inline-block;
            padding: 14px 28px;
            font-size: 16px;
            color: #ffffff;
            background-color: #78909C;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: opacity 0.3s;
            width: 100%;
            text-align: center;
            box-sizing: border-box;
            margin-top: 20px;
          }

          .btn:hover {
            opacity: 0.85;
          }
        </style>
      </head>
      <body>
        <div class="container">
            
          <img class="logo" src="http://cdn.dan-tech.com/files/images/icon-192.png" alt="Taskflow 로고">
          <h1>✈️️ 실무 결과 공유</h1>
          <div class="grid">
            <div class="box">
              <strong>프로젝트 정보</strong>
              <br>
              <table>
                <tr>
                  <th>카테고리</th>
                  <td>${categoryName}</td>
                </tr>
                <tr>
                  <th>고객사</th>
                  <td>${clientName}</td>
                </tr>
                <tr>
                  <th>프로젝트 코드</th>
                  <td>${projectCode}</td>
                </tr>
                <tr>
                  <th>프로젝트 명</th>
                  <td>${projectName}</td>
                </tr>
                <tr>
                  <th>작성자</th>
                  <td> ${username} (<a href="mailto:${userEmail}" style="color: #78909C; text-decoration: none;">${userEmail}</a>) </td>
                </tr>
                <tr>
                  <th>PM</th>
                  <td> ${managerDisplay} </td>
                </tr>
              </table>
            </div>
            <div class="box">
              <strong>실무 내용</strong>
              <br>
              <div style="margin-top: 10px; line-height: 1.6; color: #111827;">
                ${processedContent}
              </div>
            </div>
            
            ${attachmentsHtml}

          </div>
          <a href="${url}" class="btn" target="_blank">프로젝트 바로가기</a>
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
    const toRecipients = users
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
      schedule.start,
      schedule.end,
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
    const toRecipients = users
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
    const toRecipients = users
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
      report.content,
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

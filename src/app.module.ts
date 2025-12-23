import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import config from 'config';
import * as Joi from 'joi';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ProjectModule } from './project/project.module';
import { ProjectClientModule } from './project/project-client.module';
import { ScheduleModule } from './schedule/schedule.module';
import { BookmarkModule } from './bookmark/bookmark.module';
import { SftpModule } from './sftp/sftp.module';
import { UserDepartmentModule } from './user/user-department.module';
import { SupplierModule } from './supplier/supplier.module';
import { ReportModule } from './report/report.module';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { MailModule } from './mail/mail.module';
import { CurrencyModule } from './currency/currency.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { IssueModule } from './issue/issue.module';
import { IssueAttachmentModule } from './issue/issue-attachment.module';
import { ReportAttachmentModule } from './report/report-attachment.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.${process.env.NODE_ENV}.env`,
      load: [config],
      isGlobal: true,
      validationSchema: Joi.object({
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        ACCESS_TOKEN_EXPIRATION: Joi.string().required(),
        REFRESH_TOKEN_EXPIRATION: Joi.string().required(),
      }),
      validationOptions: {
        abortEarly: true,
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [config.KEY],
      useFactory: (configService: ConfigType<typeof config>) => {
        return {
          type: 'postgres',
          host: configService.postgresql.host,
          port: configService.postgresql.port,
          username: configService.postgresql.username,
          password: configService.postgresql.password,
          database: configService.postgresql.database,
          autoLoadEntities: true,
          keepConnectionAlive: true,
          synchronize: false,
          logging: true,
          namingStrategy: new SnakeNamingStrategy(),
        };
      },
    }),
    RedisModule.forRootAsync({
      inject: [config.KEY],
      useFactory: (configService: ConfigType<typeof config>) => {
        return {
          type: 'single',
          url: configService.redis.url,
        };
      },
    }),
    AuthModule,
    BookmarkModule,
    CurrencyModule,
    DashboardModule,
    ScheduleModule,
    IssueModule,
    IssueAttachmentModule,
    MailModule,
    ProjectClientModule,
    ProjectModule,
    SftpModule,
    SupplierModule,
    ReportModule,
    ReportAttachmentModule,
    UserDepartmentModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

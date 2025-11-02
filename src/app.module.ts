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
import { IssueModule } from './issue/issue.module';
import { BookmarkModule } from './bookmark/bookmark.module';
import { SftpModule } from './sftp/sftp.module';
import { UserDepartmentModule } from './user/user-department.module';
import { IssueAttachmentModule } from './issue/issue-attachment.module';
import { SupplierModule } from './supplier/supplier.module';
import { TripModule } from './trip/trip.module';
import { ExchangeModule } from './exchange/exchange.module';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.${process.env.NODE_ENV}.env`,
      load: [config],
      isGlobal: true,
      validationSchema: Joi.object({
        JWT_SECRET: Joi.string().required(),
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
    AuthModule,
    BookmarkModule,
    ExchangeModule,
    ScheduleModule,
    IssueModule,
    IssueAttachmentModule,
    ProjectClientModule,
    ProjectModule,
    SftpModule,
    SupplierModule,
    TripModule,
    UserDepartmentModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

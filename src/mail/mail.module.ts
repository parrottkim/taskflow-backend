import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.service';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [ConfigModule, UserModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}

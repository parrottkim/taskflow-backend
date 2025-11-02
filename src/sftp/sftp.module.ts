import { Module } from '@nestjs/common';
import { SftpService } from './sftp.service';
import { SftpController } from './sftp.controller';

@Module({
  controllers: [SftpController],
  providers: [SftpService],
  exports: [SftpService],
})
export class SftpModule {}

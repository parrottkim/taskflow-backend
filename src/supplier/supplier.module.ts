import { Module } from '@nestjs/common';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from '@/entity/supplier/supplier.entity';
import { SftpModule } from '@/sftp/sftp.module';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier]), SftpModule],
  controllers: [SupplierController],
  providers: [SupplierService],
})
export class SupplierModule {}

import { Module } from '@nestjs/common';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from '@/entity/supplier/supplier.entity';
import { SupplierKeyword } from '@/entity/supplier/supplier-keyword.entity';
import { SftpModule } from '@/sftp/sftp.module';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, SupplierKeyword]), SftpModule],
  controllers: [SupplierController],
  providers: [SupplierService],
  exports: [SupplierService],
})
export class SupplierModule {}

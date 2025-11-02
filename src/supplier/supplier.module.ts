import { Module } from '@nestjs/common';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from 'src/entity/supplier/supplier.entity';
import { SupplierKeyword } from 'src/entity/supplier/supplier-keyword.entity';
import { SftpService } from 'src/sftp/sftp.service';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, SupplierKeyword])],
  controllers: [SupplierController],
  providers: [SupplierService, SftpService],
  exports: [SupplierService],
})
export class SupplierModule {}

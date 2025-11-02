import { PartialType } from '@nestjs/swagger';
import { CreateSupplierDto } from './create-supplier';

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}

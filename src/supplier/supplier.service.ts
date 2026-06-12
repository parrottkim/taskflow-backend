import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Supplier } from '@/entity/supplier/supplier.entity';
import { Brackets, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { CreateSupplierDto } from './dto/create-supplier';
import { GetSuppliersDto } from './dto/get-suppliers';
import { SupplierDto, SupplierListDto } from './dto/supplier';
import { UpdateSupplierDto } from './dto/update-supplier';
import { SftpService } from '@/sftp/sftp.service';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    private readonly sftpService: SftpService,
  ) {}

  async findSupplierById(id: number) {
    return await this.supplierRepository
      .createQueryBuilder('supplier')
      .where('supplier.id = :id', { id })
      .getOne();
  }

  async findSupplierByName(name: string) {
    return await this.supplierRepository
      .createQueryBuilder('supplier')
      .where('supplier.name = :name', { name })
      .getOne();
  }

  async findSuppliers(value: GetSuppliersDto) {
    let queryBuilder = this.supplierRepository.createQueryBuilder('supplier');

    if (value.search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.orWhere('supplier.name ILIKE :search', {
            search: `%${value.search}%`,
          });
        }),
      );
    }

    return queryBuilder
      .orderBy('id', 'DESC')
      .skip((value.page - 1) * value.limit)
      .take(value.limit)
      .getManyAndCount();
  }

  async getSupplier(id: number) {
    const supplier = await this.findSupplierById(id);

    if (!supplier) {
      throw new NotFoundException('supplier_not_found');
    }

    const supplierDto = plainToInstance(SupplierDto, supplier, {
      excludeExtraneousValues: true,
    });

    return supplierDto;
  }

  async getSuppliers(query: GetSuppliersDto) {
    const [suppliers, total] = await this.findSuppliers(query);

    const supplierListDto = plainToInstance(SupplierListDto, {
      items: suppliers,
      page: query.page,
      total: total,
    });

    return supplierListDto;
  }

  async createSupplier(body: CreateSupplierDto) {
    const existingSupplier = await this.supplierRepository.findOne({
      where: { number: body.number },
    });

    if (existingSupplier) {
      throw new ConflictException('supplier_exists');
    }

    const supplier = this.supplierRepository.create({
      name: body.name,
      number: body.number,
      zipcode: body.zipcode,
      roadAddress: body.roadAddress,
      roadAddressReference: body.roadAddressReference,
      detailAddress: body.detailAddress,
      phone: body.phone,
      email: body.email,
      logo: body.logo,
    });

    const saved = await this.supplierRepository.save(supplier);

    const supplierDto = plainToInstance(SupplierDto, saved, {
      excludeExtraneousValues: true,
    });

    return supplierDto;
  }

  async updateSupplier(id: number, body: UpdateSupplierDto) {
    const supplier = await this.findSupplierById(id);

    if (!supplier) {
      throw new NotFoundException('supplier_not_found');
    }

    if (body.logo !== undefined && supplier.logo !== body.logo) {
      if (supplier.logo) {
        try {
          // 기존 파일 URL을 이용해 SFTP 스토리지에서 삭제 처리
          // 💡 보유 중이신 SFTP 서비스의 URL 삭제 메서드명(예: deleteFileByUrl)으로 맞춰주세요.
          await this.sftpService.deleteFileByUrl(supplier.logo);
        } catch (e) {
          // 파일 삭제 실패가 전체 업데이트 트랜잭션을 롤백하지 않도록 예외 완화(Warning) 처리
          console.warn(`기존 공급업체 로고 삭제 실패: ${supplier.logo}`, e);
        }
      }
      supplier.logo = body.logo;
    }

    supplier.name = body.name ?? supplier.name;
    supplier.number = body.number ?? supplier.number;
    supplier.zipcode = body.zipcode ?? supplier.zipcode;
    supplier.roadAddress = body.roadAddress ?? supplier.roadAddress;
    supplier.roadAddressReference =
      body.roadAddressReference ?? supplier.roadAddressReference;
    supplier.detailAddress = body.detailAddress ?? supplier.detailAddress;
    supplier.phone = body.phone ?? supplier.phone;
    supplier.email = body.email ?? supplier.email;
    supplier.logo = body.logo ?? supplier.logo;

    const saved = await this.supplierRepository.save(supplier);

    const supplierDto = plainToInstance(SupplierDto, saved, {
      excludeExtraneousValues: true,
    });

    return supplierDto;
  }

  async deleteSupplier(id: number) {
    const supplier = await this.findSupplierById(id);

    if (!supplier) {
      throw new NotFoundException('supplier_not_found');
    }

    await this.sftpService.deleteFileByUrl(supplier.logo);
    await this.supplierRepository.remove(supplier);

    return true;
  }
}

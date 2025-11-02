import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Supplier } from 'src/entity/supplier/supplier.entity';
import { Brackets, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { SupplierKeyword } from 'src/entity/supplier/supplier-keyword.entity';
import { CreateSupplierDto } from './dto/create-supplier';
import { GetSuppliersDto } from './dto/get-suppliers';
import { SupplierDto, SupplierListDto } from './dto/supplier';
import { UpdateSupplierDto } from './dto/update-supplier';
import { SftpService } from 'src/sftp/sftp.service';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(SupplierKeyword)
    private readonly supplierKeywordRepository: Repository<SupplierKeyword>,
    private readonly sftpService: SftpService,
  ) {}

  async findSupplierById(id: number) {
    return await this.supplierRepository
      .createQueryBuilder('supplier')
      .leftJoinAndSelect('supplier.keywords', 'keywords')
      .where('supplier.id = :id', { id })
      .getOne();
  }

  async findSupplierByName(name: string) {
    return await this.supplierRepository
      .createQueryBuilder('supplier')
      .leftJoinAndSelect('supplier.keywords', 'keywords')
      .where('supplier.name = :name', { name })
      .getOne();
  }

  async findSuppliers(value: GetSuppliersDto) {
    let queryBuilder = this.supplierRepository
      .createQueryBuilder('supplier')
      .leftJoinAndSelect('supplier.keywords', 'keywords');

    if (value.search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.orWhere('supplier.name ILIKE :search', {
            search: `%${value.search}%`,
          }).orWhere('keywords.name ILIKE :search', {
            search: `%${value.search}%`,
          });
        }),
      );
    }

    return queryBuilder
      .skip((value.page - 1) * value.limit)
      .take(value.limit)
      .getManyAndCount();
  }

  async findKeywordByName(name: string) {
    return await this.supplierKeywordRepository
      .createQueryBuilder('keyword')
      .leftJoinAndSelect('keyword.supplier', 'supplier');
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

  async getSuppliers(value: GetSuppliersDto) {
    const [suppliers, total] = await this.findSuppliers(value);

    const supplierListDto = plainToInstance(SupplierListDto, {
      items: suppliers,
      page: value.page,
      total: total,
    });

    return supplierListDto;
  }

  async createSupplier(value: CreateSupplierDto) {
    const existingSupplier = await this.supplierRepository.findOne({
      where: { name: value.name },
    });

    if (existingSupplier) {
      throw new ConflictException('supplier_exists');
    }

    const supplier = this.supplierRepository.create({
      name: value.name,
      number: value.number,
      address: value.address,
      phone: value.phone,
      email: value.email,
      logo: value.logo,
    });

    if (value.keywords?.length) {
      supplier.keywords = [];

      for (const name of value.keywords) {
        let keyword = await this.supplierKeywordRepository.findOne({
          where: { name },
        });

        if (!keyword) {
          keyword = this.supplierKeywordRepository.create({ name });
          await this.supplierKeywordRepository.save(keyword);
        }

        supplier.keywords.push(keyword);
      }
    }

    const saved = await this.supplierRepository.save(supplier);

    const supplierDto = plainToInstance(SupplierDto, saved, {
      excludeExtraneousValues: true,
    });

    return supplierDto;
  }

  async updateSupplier(id: number, value: UpdateSupplierDto) {
    const supplier = await this.findSupplierById(id);

    supplier.name = value.name ?? supplier.name;
    supplier.number = value.number ?? supplier.number;
    supplier.address = value.address ?? supplier.address;
    supplier.phone = value.phone ?? supplier.phone;
    supplier.email = value.email ?? supplier.email;
    supplier.logo = value.logo ?? supplier.logo;

    if (value.keywords) {
      supplier.keywords = [];
      for (const name of value.keywords) {
        let keyword = await this.supplierKeywordRepository.findOne({
          where: { name },
        });
        if (!keyword) {
          keyword = this.supplierKeywordRepository.create({ name });
          await this.supplierKeywordRepository.save(keyword);
        }
        supplier.keywords.push(keyword);
      }
    }

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

    await this.sftpService.deleteFile(supplier.logo);
    await this.supplierRepository.remove(supplier);

    // 사용되지 않는 키워드 삭제
    await this.supplierKeywordRepository
      .createQueryBuilder('keyword')
      .leftJoin('keyword.suppliers', 'supplier')
      .where('supplier.id IS NULL')
      .delete()
      .execute();

    return { success: true };
  }
}

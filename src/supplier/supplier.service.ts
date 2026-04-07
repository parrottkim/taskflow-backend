import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Supplier } from '@/entity/supplier/supplier.entity';
import { Brackets, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { SupplierKeyword } from '@/entity/supplier/supplier-keyword.entity';
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
      where: { name: body.name },
    });

    if (existingSupplier) {
      throw new ConflictException('supplier_exists');
    }

    const supplier = this.supplierRepository.create({
      name: body.name,
      number: body.number,
      address: body.address,
      phone: body.phone,
      email: body.email,
      logo: body.logo,
    });

    if (body.keywords?.length) {
      supplier.keywords = [];

      for (const name of body.keywords) {
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

  async updateSupplier(id: number, body: UpdateSupplierDto) {
    const supplier = await this.findSupplierById(id);

    supplier.name = body.name ?? supplier.name;
    supplier.number = body.number ?? supplier.number;
    supplier.address = body.address ?? supplier.address;
    supplier.phone = body.phone ?? supplier.phone;
    supplier.email = body.email ?? supplier.email;
    supplier.logo = body.logo ?? supplier.logo;

    if (body.keywords) {
      supplier.keywords = [];
      for (const name of body.keywords) {
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

    await this.sftpService.deleteFileByUrl(supplier.logo);
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

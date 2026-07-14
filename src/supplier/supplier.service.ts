import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Supplier } from '@/entity/supplier/supplier.entity';
import { Brackets, DataSource, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { CreateSupplierDto } from './dto/create-supplier';
import { GetSuppliersDto } from './dto/get-suppliers';
import { SupplierDto, SupplierListDto } from './dto/supplier';
import { UpdateSupplierDto } from './dto/update-supplier';
import { SftpService } from '@/sftp/sftp.service';
import { User } from '@/entity/user/user.entity';
import { assertWriteAccess } from '@/common/policies/write-access.policy';

@Injectable()
export class SupplierService {
  constructor(
    private readonly dataSource: DataSource,
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

  async createSupplier(user: User, body: CreateSupplierDto) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingSupplier = await queryRunner.manager.findOne(Supplier, {
        where: { number: body.number },
      });

      if (existingSupplier) {
        throw new ConflictException('supplier_exists');
      }

      const supplier = queryRunner.manager.create(Supplier, {
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

      const saved = await queryRunner.manager.save(supplier);

      await queryRunner.commitTransaction();

      const supplierDto = plainToInstance(SupplierDto, saved, {
        excludeExtraneousValues: true,
      });

      return supplierDto;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateSupplier(user: User, id: number, body: UpdateSupplierDto) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const supplier = await queryRunner.manager.findOne(Supplier, {
        where: { id },
      });

      if (!supplier) {
        throw new NotFoundException('supplier_not_found');
      }

      if (body.logo !== undefined && supplier.logo !== body.logo) {
        if (supplier.logo) {
          try {
            await this.sftpService.deleteFileByUrl(supplier.logo);
          } catch (e) {
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

      const saved = await queryRunner.manager.save(supplier);

      await queryRunner.commitTransaction();

      const supplierDto = plainToInstance(SupplierDto, saved, {
        excludeExtraneousValues: true,
      });

      return supplierDto;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteSupplier(user: User, id: number) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const supplier = await queryRunner.manager.findOne(Supplier, {
        where: { id },
      });

      if (!supplier) {
        throw new NotFoundException('supplier_not_found');
      }

      if (supplier.logo) {
        await this.sftpService.deleteFileByUrl(supplier.logo);
      }

      await queryRunner.manager.remove(supplier);

      await queryRunner.commitTransaction();

      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

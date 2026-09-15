import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { DataSource, Repository } from 'typeorm';
import { Issue } from '@/entity/issue/issue.entity';
import { ProcurementIssueItem } from '@/entity/issue/procurement/procurement-issue-item.entity';
import { ProcurementIssueRequestItem } from '@/entity/issue/procurement/procurement-issue-request-item.entity';
import { ProcurementIssueRequest } from '@/entity/issue/procurement/procurement-issue-request.entity';
import { ProcurementIssue } from '@/entity/issue/procurement/procurement-issue.entity';
import { Supplier } from '@/entity/supplier/supplier.entity';
import { User } from '@/entity/user/user.entity';
import { MailService } from '@/mail/mail.service';
import { assertOwnerOrAdmin } from '@/common/policies/resource-access.policy';
import { assertWriteAccess } from '@/common/policies/write-access.policy';
import dayjs from 'dayjs';
import { CreateProcurementIssueDto } from '../dto/create-issue';
import { GetIssuesDto } from '../dto/get-issues';
import { IssueListDto, ProcurementIssueDto } from '../dto/issue';
import {
  CreateProcurementRequestDto,
  UpdateProcurementRequestDto,
} from '../dto/procurement-issue-request';
import { UpdateProcurementIssueDto } from '../dto/update-issue';
import { IssueFileOperation, IssueService } from '../issue.service';

@Injectable()
export class ProcurementIssueService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    private readonly mailService: MailService,
    private readonly issueService: IssueService,
  ) {}

  async getProcurementIssues(value: GetIssuesDto) {
    const [issues, total] = await this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.project', 'project')
      .leftJoinAndSelect('issue.category', 'category')
      .leftJoinAndSelect('issue.createdBy', 'createdBy')
      .leftJoinAndSelect('issue.updatedBy', 'updatedBy')
      .leftJoinAndSelect('createdBy.rank', 'rank')
      .leftJoinAndSelect('createdBy.department', 'department')
      .leftJoinAndSelect('updatedBy.rank', 'updatedByRank')
      .leftJoinAndSelect('updatedBy.department', 'updatedByDepartment')
      .leftJoinAndSelect('issue.attachments', 'attachment')
      .innerJoinAndSelect('issue.procurement', 'procurement')
      .leftJoinAndSelect('procurement.items', 'items')
      .leftJoinAndSelect('items.supplier', 'supplier')
      .leftJoinAndSelect('procurement.requests', 'requests')
      .leftJoinAndSelect('requests.requestedBy', 'requestedBy')
      .leftJoinAndSelect('requests.items', 'requestItem')
      .leftJoinAndSelect('requests.supplier', 'requestSupplier')
      .where('project.id = :id', { id: value.projectId })
      .orderBy('issue.createdAt', 'DESC')
      .addOrderBy('attachment.createdAt', 'DESC')
      .skip((value.page - 1) * value.limit)
      .take(value.limit)
      .getManyAndCount();

    const items = issues.map((issue) => {
      return plainToInstance(
        ProcurementIssueDto,
        {
          ...issue,
          procurementItems: issue.procurement?.items || [],
          requests: issue.procurement?.requests,
        },
        {
          excludeExtraneousValues: true,
        },
      );
    });

    return plainToInstance(
      IssueListDto,
      {
        items: items,
        page: value.page,
        total,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  async createProcurementIssueRequest(
    user: User,
    id: number,
    body: CreateProcurementRequestDto,
  ) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const issue = await queryRunner.manager.findOne(Issue, {
        where: { id },
        relations: [
          'project',
          'createdBy',
          'category',
          'procurement',
          'procurement.items',
          'procurement.items.supplier',
          'procurement.requests',
          'procurement.requests.requestedBy',
          'procurement.requests.items',
          'procurement.requests.supplier',
          'attachments',
        ],
      });
      if (!issue) throw new NotFoundException('not_found_issue');

      await queryRunner.manager.save(issue.procurement);

      const totalAmount = body.items.reduce(
        (sum, item) => sum + (item.totalAmount ?? 0),
        0,
      );
      const requiresApproval = totalAmount > 500000;

      const request = await queryRunner.manager.create(
        ProcurementIssueRequest,
        {
          requestedBy: user,
          procurement: issue.procurement,
          title: body.title,
          orderDate: dayjs().toDate(),
          deliveryDate: body.deliveryDate,
          paymentTerms: body.paymentTerms,
          serialNumber: dayjs().format('YYYYMMDDHHmmss'),
          supplier: body.supplierId
            ? await queryRunner.manager.findOne(Supplier, {
                where: { id: body.supplierId },
              })
            : null,
          hasFee: body.hasFee,
          requiresApproval,
          isApproved: false,
          approvedBy: null,
          approvedAt: null,
          note: body.note,
        },
      );

      const savedRequest = await queryRunner.manager.save(request);

      const items = await Promise.all(
        body.items.map(async (dto) =>
          queryRunner.manager.create(ProcurementIssueRequestItem, {
            request: savedRequest,
            ...dto,
            supplier: dto.supplierId
              ? await queryRunner.manager.findOne(Supplier, {
                  where: { id: dto.supplierId },
                })
              : null,
          }),
        ),
      );
      savedRequest.items = items;

      await queryRunner.manager.save(savedRequest);

      issue.procurement.requests = [
        ...(issue.procurement.requests ?? []),
        savedRequest,
      ];

      issue.updatedBy = user;
      const saved = await queryRunner.manager.save(issue);

      await queryRunner.commitTransaction();

      if (requiresApproval) {
        try {
          await this.mailService.sendProcurementApprovalRequestMail({
            projectCode: issue.project.code,
            projectName: issue.project.name,
            projectId: issue.project.id,
            issueId: issue.id,
            serialNumber: savedRequest.serialNumber,
            requesterName: user.username,
            requesterEmail: user.email,
            totalAmount,
          });
        } catch (e) {
          console.warn('발주서 승인 요청 메일 전송 실패', e);
        }
      }

      return await this.issueService.mapIssueToDto(saved);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateProcurementIssueRequest(
    user: User,
    id: number,
    body: UpdateProcurementRequestDto,
  ) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let issueId: number;

    try {
      const request = await queryRunner.manager.findOne(
        ProcurementIssueRequest,
        {
          where: { id },
          relations: [
            'requestedBy',
            'items',
            'procurement',
            'procurement.issue',
            'procurement.issue.createdBy',
          ],
        },
      );

      if (!request)
        throw new NotFoundException('not_found_procurement_request');

      assertOwnerOrAdmin(user, request.requestedBy.id);

      issueId = request.procurement.issue.id;

      if (body.title !== undefined) request.title = body.title;
      if (body.deliveryDate !== undefined) {
        request.deliveryDate = body.deliveryDate;
      }
      if (body.paymentTerms !== undefined) {
        request.paymentTerms = body.paymentTerms;
      }
      if (body.hasFee !== undefined) request.hasFee = body.hasFee;
      if (body.note !== undefined) request.note = body.note;

      if (body.supplierId !== undefined) {
        request.supplier = body.supplierId
          ? await queryRunner.manager.findOne(Supplier, {
              where: { id: body.supplierId },
            })
          : null;
      }

      const existingItems = await queryRunner.manager.find(
        ProcurementIssueRequestItem,
        {
          where: { request: { id: request.id } },
        },
      );

      const items = body.items.map((dto) => {
        if (dto.id) {
          const existing = existingItems.find((e) => e.id === dto.id);
          if (existing) {
            existing.item = dto.item;
            existing.spec = dto.spec;
            existing.quantity = dto.quantity;
            existing.unitPrice = dto.unitPrice;
            existing.totalAmount = dto.totalAmount;
            existing.note = dto.note;
            return existing;
          }
        }

        return queryRunner.manager.create(ProcurementIssueRequestItem, {
          request,
          item: dto.item,
          spec: dto.spec,
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          totalAmount: dto.totalAmount,
          note: dto.note,
        });
      });

      const savedItems = await queryRunner.manager.save(items);
      request.items = savedItems;

      const totalAmount = savedItems.reduce(
        (sum, item) => sum + (item.totalAmount ?? 0),
        0,
      );
      request.requiresApproval = totalAmount > 500000;
      request.isApproved = false;
      request.approvedBy = null;
      request.approvedAt = null;

      await queryRunner.manager.save(request);
      request.procurement.issue.updatedBy = user;
      await queryRunner.manager.save(request.procurement.issue);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    return await this.issueService.getIssue(issueId);
  }

  async approveProcurementIssueRequest(user: User, id: number) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const approver = await queryRunner.manager.findOne(User, {
        where: { id: user.id },
        relations: ['rank'],
      });

      if (!approver || approver.rank?.id !== 1) {
        throw new ForbiddenException('forbidden_access_denied');
      }

      const request = await queryRunner.manager.findOne(
        ProcurementIssueRequest,
        {
          where: { id },
          relations: [
            'requestedBy',
            'procurement',
            'procurement.project',
            'procurement.issue',
          ],
        },
      );

      if (!request)
        throw new NotFoundException('not_found_procurement_request');

      if (!request.requiresApproval) {
        await queryRunner.commitTransaction();
        return true;
      }

      request.isApproved = true;
      request.approvedBy = approver;
      request.approvedAt = dayjs().toDate();

      await queryRunner.manager.save(request);
      request.procurement.issue.updatedBy = approver;
      await queryRunner.manager.save(request.procurement.issue);
      await queryRunner.commitTransaction();

      try {
        await this.mailService.sendProcurementApprovedMail({
          projectCode: request.procurement.project.code,
          projectName: request.procurement.project.name,
          projectId: request.procurement.project.id,
          issueId: request.procurement.issue.id,
          serialNumber: request.serialNumber,
          requesterName: request.requestedBy.username,
          requesterEmail: request.requestedBy.email,
          approverName: approver.username,
          approvedAt: request.approvedAt,
        });
      } catch (e) {
        console.warn('발주서 승인 완료 메일 전송 실패', e);
      }

      return true;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteProcurementIssueRequest(user: User, id: number) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const request = await queryRunner.manager.findOne(
        ProcurementIssueRequest,
        {
          where: { id },
          relations: [
            'requestedBy',
            'procurement',
            'procurement.issue',
            'procurement.issue.createdBy',
          ],
        },
      );

      if (!request)
        throw new NotFoundException('not_found_procurement_request');

      assertOwnerOrAdmin(user, request.requestedBy.id);

      await queryRunner.manager.softDelete(ProcurementIssueRequestItem, {
        request: { id: request.id },
      });
      await queryRunner.manager.softDelete(ProcurementIssueRequest, request.id);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    return true;
  }

  async createProcurementIssue(user: User, body: CreateProcurementIssueDto) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await this.issueService.findAndLockProject(
        queryRunner.manager,
        body.projectId,
      );

      // 2️⃣ 카테고리 조회
      const category = await this.issueService.findIssueCategory(
        queryRunner.manager,
        body.categoryId,
        4,
      );

      const issue = await queryRunner.manager.create(Issue, {
        project,
        category,
        createdBy: user,
        updatedBy: user,
        content: body.content,
      });
      const savedIssue = await queryRunner.manager.save(issue);

      const procurement = await queryRunner.manager.create(ProcurementIssue, {
        issue: savedIssue,
        project,
      });
      const savedProcurement = await queryRunner.manager.save(procurement);

      const items = await Promise.all(
        body.procurementItems.map(async (dto) =>
          queryRunner.manager.create(ProcurementIssueItem, {
            procurement: savedProcurement,
            ...dto,
            supplier: dto.supplierId
              ? await queryRunner.manager.findOne(Supplier, {
                  where: { id: dto.supplierId },
                })
              : null,
          }),
        ),
      );
      savedProcurement.items = items;

      await queryRunner.manager.save(savedProcurement);

      savedIssue.procurement = savedProcurement;

      await this.issueService.advanceLatestCategory(
        queryRunner.manager,
        project,
        category,
      );

      await queryRunner.commitTransaction();
      return await this.issueService.mapIssueToDto(savedIssue);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateProcurementIssue(
    user: User,
    id: number,
    body: UpdateProcurementIssueDto,
  ) {
    assertWriteAccess(user);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let saved: Issue;
    let fileOperations: IssueFileOperation[] = [];

    try {
      const issue = await queryRunner.manager.findOne(Issue, {
        where: { id },
        relations: [
          'project',
          'createdBy',
          'category',
          'procurement',
          'procurement.items',
          'procurement.items.supplier',
          'procurement.requests',
          'procurement.requests.requestedBy',
          'procurement.requests.items',
          'procurement.requests.supplier',
          'attachments',
        ],
      });
      if (!issue) throw new NotFoundException('not_found_issue');

      assertOwnerOrAdmin(user, issue.createdBy.id);

      fileOperations = await this.issueService.applyCommonIssueUpdate(
        queryRunner.manager,
        issue,
        body,
      );

      if (body.procurementItems) {
        const existingItems = await queryRunner.manager.find(
          ProcurementIssueItem,
          {
            where: { procurement: { id: issue.procurement.id } },
          },
        );

        const toRemove = existingItems.filter(
          (e) => !body.procurementItems.some((dto) => dto.id === e.id),
        );
        if (toRemove.length) {
          await queryRunner.manager.softDelete(
            ProcurementIssueItem,
            toRemove.map((item) => item.id),
          );
        }

        const items = await Promise.all(
          body.procurementItems.map(async (dto) => {
            if (dto.id) {
              const existing = existingItems.find((e) => e.id === dto.id);
              if (existing) {
                existing.item = dto.item;
                existing.spec = dto.spec;
                existing.quantity = dto.quantity;
                existing.unitPrice = dto.unitPrice;
                existing.totalAmount = dto.totalAmount;
                existing.isOnlinePurchase = dto.isOnlinePurchase;
                existing.purchaseUrl = dto.purchaseUrl;
                existing.note = dto.note;

                // ⭐ supplier 유지 / 변경 로직
                if (dto.supplierId !== undefined) {
                  existing.supplier = dto.supplierId
                    ? await queryRunner.manager.findOne(Supplier, {
                        where: { id: dto.supplierId },
                      })
                    : null;
                }

                return existing;
              }
            }

            return queryRunner.manager.create(ProcurementIssueItem, {
              procurement: issue.procurement,
              item: dto.item,
              spec: dto.spec,
              quantity: dto.quantity,
              unitPrice: dto.unitPrice,
              totalAmount: dto.totalAmount,
              isOnlinePurchase: dto.isOnlinePurchase,
              purchaseUrl: dto.purchaseUrl,
              supplier: dto.supplierId
                ? await queryRunner.manager.findOne(Supplier, {
                    where: { id: dto.supplierId },
                  })
                : null,
              note: dto.note,
            });
          }),
        );

        const savedItems = await queryRunner.manager.save(items);
        issue.procurement.items = savedItems;
      }

      issue.updatedBy = user;
      saved = await queryRunner.manager.save(issue);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    await this.issueService.executeFileOperations(fileOperations);
    return await this.issueService.mapIssueToDto(saved);
  }
}

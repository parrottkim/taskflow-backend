import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '@/entity/document/document.entity';
import { assertOwnerOrAdmin } from '../policies/resource-access.policy';

@Injectable()
export class DocumentEditGuard implements CanActivate {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const documentId = Number(request.params.id);

    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: ['createdBy'],
    });

    if (!document) {
      throw new NotFoundException('document_not_found');
    }

    assertOwnerOrAdmin(user, document.createdBy.id);

    request.validateDocumentId = document.id;

    return true;
  }
}

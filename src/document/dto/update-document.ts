import { PartialType } from '@nestjs/swagger';
import { CreateDocumentDto } from './create-document';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}

import { PartialType } from '@nestjs/swagger';
import { CreateFolderDto } from './create-folder';

export class UpdateFolderDto extends PartialType(CreateFolderDto) {}

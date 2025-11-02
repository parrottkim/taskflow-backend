import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';
import { ProjectClientDto } from './project-client';
import { Type } from 'class-transformer';

export class ProjectClientClosureDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  ancestor: number; // 부모 노드 ID

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  descendant: number; // 자식 노드 ID

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  depth: number; // 루트에서의 깊이

  @ApiProperty({ type: () => ProjectClientDto })
  @Type(() => ProjectClientDto)
  ancestorClient: ProjectClientDto; // 부모 노드의 상세 정보

  @ApiProperty({ type: () => ProjectClientDto })
  @Type(() => ProjectClientDto)
  descendantClient: ProjectClientDto; // 자식 노드의 상세 정보
}

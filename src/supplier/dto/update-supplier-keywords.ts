import { IsInt, IsNotEmpty, IsArray, IsString } from 'class-validator';

export class UpdateSupplierKeywordsDto {
  @IsInt()
  @IsNotEmpty()
  supplierId: number;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  keywords: string[];
}

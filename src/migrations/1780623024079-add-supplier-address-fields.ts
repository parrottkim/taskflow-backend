import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupplierAddressFields1780623024079 implements MigrationInterface {
  name = 'AddSupplierAddressFields1780623024079';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 새 컬럼들 먼저 생성
    await queryRunner.query(
      `ALTER TABLE "supplier" ADD "zipcode" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier" ADD "road_address" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier" ADD "road_address_reference" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier" ADD "detail_address" character varying`,
    );

    // 2. 데이터 이관 (이제 road_address가 존재하므로 가능)
    await queryRunner.query(`UPDATE "supplier" SET "road_address" = "address"`);

    // 3. 구 컬럼 삭제
    await queryRunner.query(`ALTER TABLE "supplier" DROP COLUMN "address"`);

    // 4. 기타 로직
    await queryRunner.query(
      `ALTER TABLE "procurement_issue_request" ALTER COLUMN "title" DROP DEFAULT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. 구 컬럼 복구 (먼저 만들어야 데이터를 넣을 수 있음)
    await queryRunner.query(
      `ALTER TABLE "supplier" ADD "address" character varying`,
    );

    // 2. 데이터 원복
    await queryRunner.query(`UPDATE "supplier" SET "address" = "road_address"`);

    // 3. 새 컬럼들 삭제
    await queryRunner.query(
      `ALTER TABLE "supplier" DROP COLUMN "detail_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier" DROP COLUMN "road_address_reference"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier" DROP COLUMN "road_address"`,
    );
    await queryRunner.query(`ALTER TABLE "supplier" DROP COLUMN "zipcode"`);

    // 4. 기타 로직 원복
    await queryRunner.query(
      `ALTER TABLE "procurement_issue_request" ALTER COLUMN "title" SET DEFAULT ''`,
    );
  }
}

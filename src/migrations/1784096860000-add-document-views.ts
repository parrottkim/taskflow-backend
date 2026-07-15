import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentViews1784096860000 implements MigrationInterface {
  name = 'AddDocumentViews1784096860000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "document" ADD "views" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "document" DROP COLUMN "views"`);
  }
}

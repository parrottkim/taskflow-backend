import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIsGuest1784000000000 implements MigrationInterface {
  name = 'AddUserIsGuest1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "is_guest" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "is_guest"`);
  }
}

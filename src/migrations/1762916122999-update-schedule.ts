import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSchedule1762916122999 implements MigrationInterface {
  name = 'UpdateSchedule1762916122999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "schedule" ADD "url" character varying NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_fuel_expense" DROP COLUMN "mileage"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_fuel_expense" ADD "mileage" numeric(12,2) NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "schedule" DROP COLUMN "url"`);
    await queryRunner.query(
      `ALTER TABLE "report_fuel_expense" DROP COLUMN "mileage"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_fuel_expense" ADD "mileage" integer NOT NULL`,
    );
  }
}

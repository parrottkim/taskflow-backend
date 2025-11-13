import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateSchedule1763020263433 implements MigrationInterface {
    name = 'UpdateSchedule1763020263433'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "schedule" DROP CONSTRAINT "FK_d6be6c48e4b4c1a9882b26c3557"`);
        await queryRunner.query(`ALTER TABLE "schedule" DROP CONSTRAINT "REL_d6be6c48e4b4c1a9882b26c355"`);
        await queryRunner.query(`ALTER TABLE "schedule" DROP COLUMN "trip_id"`);
        await queryRunner.query(`ALTER TABLE "issue_category" ALTER COLUMN "sequence" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "issue_category" ALTER COLUMN "sequence" SET DEFAULT '10'`);
        await queryRunner.query(`ALTER TABLE "schedule" ADD "trip_id" integer`);
        await queryRunner.query(`ALTER TABLE "schedule" ADD CONSTRAINT "REL_d6be6c48e4b4c1a9882b26c355" UNIQUE ("trip_id")`);
        await queryRunner.query(`ALTER TABLE "schedule" ADD CONSTRAINT "FK_d6be6c48e4b4c1a9882b26c3557" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProjectStageTimestamps1772690558216 implements MigrationInterface {
    name = 'AddProjectStageTimestamps1772690558216'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" ADD "preexecuted_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "project" ADD "contracted_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "project" ADD "closed_at" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "closed_at"`);
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "contracted_at"`);
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "preexecuted_at"`);
    }

}

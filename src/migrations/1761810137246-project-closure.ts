import { MigrationInterface, QueryRunner } from "typeorm";

export class ProjectClosure1761810137246 implements MigrationInterface {
    name = 'ProjectClosure1761810137246'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "is_finished"`);
        await queryRunner.query(`ALTER TABLE "project" ADD "is_closed" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "project" ADD "closure_message" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "closure_message"`);
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "is_closed"`);
        await queryRunner.query(`ALTER TABLE "project" ADD "is_finished" boolean NOT NULL DEFAULT false`);
    }

}

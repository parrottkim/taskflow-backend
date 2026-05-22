import { MigrationInterface, QueryRunner } from "typeorm";

export class EditProcurementIssueRequest1779425489713 implements MigrationInterface {
    name = 'EditProcurementIssueRequest1779425489713'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" DROP CONSTRAINT "FK_589db240903151ee717bcbb9ad5"`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request_item" DROP COLUMN "purchase_url"`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request_item" DROP COLUMN "is_online_purchase"`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" DROP COLUMN "user_id"`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" ADD "requires_approval" boolean NOT NULL DEFAULT 'false'`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" ADD "is_approved" boolean NOT NULL DEFAULT 'false'`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" ADD "approved_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" ADD "requested_by_id" integer`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" ADD "approved_by_id" integer`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" ALTER COLUMN "has_fee" SET DEFAULT 'false'`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" ADD CONSTRAINT "FK_ccb0f1d892eac64c37ef4e2f810" FOREIGN KEY ("requested_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" ADD CONSTRAINT "FK_73764fa546a624fd6e6b53f6666" FOREIGN KEY ("approved_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" DROP CONSTRAINT "FK_73764fa546a624fd6e6b53f6666"`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" DROP CONSTRAINT "FK_ccb0f1d892eac64c37ef4e2f810"`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" ALTER COLUMN "has_fee" SET DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" DROP COLUMN "approved_by_id"`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" DROP COLUMN "requested_by_id"`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" DROP COLUMN "approved_at"`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" DROP COLUMN "is_approved"`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" DROP COLUMN "requires_approval"`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" ADD "user_id" integer`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request_item" ADD "is_online_purchase" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request_item" ADD "purchase_url" character varying`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" ADD CONSTRAINT "FK_589db240903151ee717bcbb9ad5" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}

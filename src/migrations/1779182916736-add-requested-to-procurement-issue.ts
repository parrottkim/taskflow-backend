import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRequestedToProcurementIssue1779182916736 implements MigrationInterface {
    name = 'AddRequestedToProcurementIssue1779182916736'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "procurement_issue_request_item" ("id" SERIAL NOT NULL, "item" character varying NOT NULL, "spec" character varying NOT NULL, "quantity" numeric(12,2) NOT NULL, "unit_price" numeric(12,2) NOT NULL, "total_amount" numeric(12,2) NOT NULL, "note" character varying, "is_online_purchase" boolean NOT NULL DEFAULT false, "purchase_url" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "request_id" integer, CONSTRAINT "PK_43ea3bb869970b76225a0fb2df7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "procurement_issue_request" ("id" SERIAL NOT NULL, "order_date" date NOT NULL, "delivery_date" date, "payment_terms" character varying, "serial_number" character varying NOT NULL, "has_fee" boolean NOT NULL DEFAULT 'false', "note" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "user_id" integer, "procurement_id" integer, "supplier_id" integer, CONSTRAINT "PK_c24f7ce8cee637f88a869261144" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "supplier" ADD "fax" character varying`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_item" ADD "note" character varying`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request_item" ADD CONSTRAINT "FK_0e98a599860871be7f8ff8868c2" FOREIGN KEY ("request_id") REFERENCES "procurement_issue_request"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" ADD CONSTRAINT "FK_589db240903151ee717bcbb9ad5" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" ADD CONSTRAINT "FK_b913f93c2fec1a6e7098ecba3a9" FOREIGN KEY ("procurement_id") REFERENCES "procurement_issue"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" ADD CONSTRAINT "FK_39c780db8249885caba520af994" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" DROP CONSTRAINT "FK_39c780db8249885caba520af994"`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" DROP CONSTRAINT "FK_b913f93c2fec1a6e7098ecba3a9"`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request" DROP CONSTRAINT "FK_589db240903151ee717bcbb9ad5"`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_request_item" DROP CONSTRAINT "FK_0e98a599860871be7f8ff8868c2"`);
        await queryRunner.query(`ALTER TABLE "procurement_issue_item" DROP COLUMN "note"`);
        await queryRunner.query(`ALTER TABLE "supplier" DROP COLUMN "fax"`);
        await queryRunner.query(`DROP TABLE "procurement_issue_request"`);
        await queryRunner.query(`DROP TABLE "procurement_issue_request_item"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCurrency1762315122966 implements MigrationInterface {
    name = 'AddCurrency1762315122966'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "currency" ("id" SERIAL NOT NULL, "code" character varying(3) NOT NULL, "symbol" character varying NOT NULL, CONSTRAINT "PK_3cda65c731a6264f0e444cc9b91" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "transaction_issue_item" ADD "currency_id" integer`);
        await queryRunner.query(`ALTER TABLE "contract_issue_item" ADD "currency_id" integer`);
        await queryRunner.query(`ALTER TABLE "transaction_issue_item" ADD CONSTRAINT "FK_4d66e66a96775b53b457785da46" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contract_issue_item" ADD CONSTRAINT "FK_63b2dcbf4eedf7615b869411957" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contract_issue_item" DROP CONSTRAINT "FK_63b2dcbf4eedf7615b869411957"`);
        await queryRunner.query(`ALTER TABLE "transaction_issue_item" DROP CONSTRAINT "FK_4d66e66a96775b53b457785da46"`);
        await queryRunner.query(`ALTER TABLE "contract_issue_item" DROP COLUMN "currency_id"`);
        await queryRunner.query(`ALTER TABLE "transaction_issue_item" DROP COLUMN "currency_id"`);
        await queryRunner.query(`DROP TABLE "currency"`);
    }

}

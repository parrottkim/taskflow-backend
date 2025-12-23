import { MigrationInterface, QueryRunner } from "typeorm";

export class IssueRefactor1766465927128 implements MigrationInterface {
    name = 'IssueRefactor1766465927128'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction_issue_item" ALTER COLUMN "ratio" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "procurement_issue" DROP CONSTRAINT "FK_e2da521c9fad0f5ed5c6f892594"`);
        await queryRunner.query(`ALTER TABLE "procurement_issue" ADD CONSTRAINT "UQ_e2da521c9fad0f5ed5c6f892594" UNIQUE ("issue_id")`);
        await queryRunner.query(`ALTER TABLE "contract_issue" DROP CONSTRAINT "FK_2feaef29daad911d5d2a59bfe83"`);
        await queryRunner.query(`ALTER TABLE "contract_issue" ALTER COLUMN "currency_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "transaction_issue" DROP CONSTRAINT "FK_721a593155673fa035c8f81f8f2"`);
        await queryRunner.query(`ALTER TABLE "transaction_issue" ALTER COLUMN "currency_id" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "declaration_issue" DROP CONSTRAINT "FK_f3671341544605c111c8c62a3b1"`);
        await queryRunner.query(`ALTER TABLE "declaration_issue" ADD CONSTRAINT "UQ_f3671341544605c111c8c62a3b1" UNIQUE ("issue_id")`);
        await queryRunner.query(`ALTER TABLE "procurement_issue" ADD CONSTRAINT "FK_e2da521c9fad0f5ed5c6f892594" FOREIGN KEY ("issue_id") REFERENCES "issue"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contract_issue" ADD CONSTRAINT "FK_2feaef29daad911d5d2a59bfe83" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_issue" ADD CONSTRAINT "FK_721a593155673fa035c8f81f8f2" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "declaration_issue" ADD CONSTRAINT "FK_f3671341544605c111c8c62a3b1" FOREIGN KEY ("issue_id") REFERENCES "issue"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "declaration_issue" DROP CONSTRAINT "FK_f3671341544605c111c8c62a3b1"`);
        await queryRunner.query(`ALTER TABLE "transaction_issue" DROP CONSTRAINT "FK_721a593155673fa035c8f81f8f2"`);
        await queryRunner.query(`ALTER TABLE "contract_issue" DROP CONSTRAINT "FK_2feaef29daad911d5d2a59bfe83"`);
        await queryRunner.query(`ALTER TABLE "procurement_issue" DROP CONSTRAINT "FK_e2da521c9fad0f5ed5c6f892594"`);
        await queryRunner.query(`ALTER TABLE "declaration_issue" DROP CONSTRAINT "UQ_f3671341544605c111c8c62a3b1"`);
        await queryRunner.query(`ALTER TABLE "declaration_issue" ADD CONSTRAINT "FK_f3671341544605c111c8c62a3b1" FOREIGN KEY ("issue_id") REFERENCES "issue"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_issue" ALTER COLUMN "currency_id" SET DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "transaction_issue" ADD CONSTRAINT "FK_721a593155673fa035c8f81f8f2" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contract_issue" ALTER COLUMN "currency_id" SET DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "contract_issue" ADD CONSTRAINT "FK_2feaef29daad911d5d2a59bfe83" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "procurement_issue" DROP CONSTRAINT "UQ_e2da521c9fad0f5ed5c6f892594"`);
        await queryRunner.query(`ALTER TABLE "procurement_issue" ADD CONSTRAINT "FK_e2da521c9fad0f5ed5c6f892594" FOREIGN KEY ("issue_id") REFERENCES "issue"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_issue_item" ALTER COLUMN "ratio" SET DEFAULT '0'`);
    }

}

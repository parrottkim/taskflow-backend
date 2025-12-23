import { MigrationInterface, QueryRunner } from 'typeorm';

export class IssueRefactor1766366181510 implements MigrationInterface {
  name = 'IssueRefactor1766366181510';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contract_issue_item" DROP CONSTRAINT "FK_8b6010fe7069ab19fa33f56bfba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue_item" DROP CONSTRAINT "FK_63b2dcbf4eedf7615b869411957"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" DROP CONSTRAINT "FK_4d66e66a96775b53b457785da46"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" DROP CONSTRAINT "FK_4d45e4e1243f0d2def43ce3e646"`,
    );

    await queryRunner.query(
      `ALTER TABLE "issue" DROP CONSTRAINT "FK_c5c1ee47a932087585aab345d4c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue_category" DROP CONSTRAINT "FK_e1865bfaa9307e379bebee48c3c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP CONSTRAINT "fk_c72d76e480d7334858782543610"`,
    );

    await queryRunner.query(
      `ALTER TABLE "issue_category" DROP COLUMN "charge_id"`,
    );
    await queryRunner.query(`ALTER TABLE "report" ADD "project_id" integer`);
    await queryRunner.query(
      `ALTER TABLE "contract_issue_item" ADD "issue_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" ADD "ratio" numeric(5,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" ADD "is_paid" boolean DEFAULT false`,
    );
    await queryRunner.query(`
      ALTER TABLE "transaction_issue_item"
      ALTER COLUMN "note" DROP NOT NULL
    `);
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" ADD "paid_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" ADD "issue_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue" ADD "project_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "kickoff_issue" ADD "project_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" ADD "project_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" ADD CONSTRAINT "UQ_34bfbb937675a502b547dab14af" UNIQUE ("project_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" ADD "currency_id" integer DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" ADD "project_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" ADD CONSTRAINT "UQ_d532e413d2ab8e9e05a7bee652e" UNIQUE ("project_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" ADD "currency_id" integer DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_issue" ADD "project_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "declaration_issue" ADD "project_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_report" ALTER COLUMN "is_deducted" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_report" ALTER COLUMN "is_deducted" SET DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "schedule" ALTER COLUMN "url" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue" DROP CONSTRAINT "FK_e2da521c9fad0f5ed5c6f892594"`,
    );
    await queryRunner.query(`
      UPDATE contract_issue_item cii
      SET issue_id = ci.issue_id
      FROM contract_issue ci
      WHERE cii.contract_id = ci.id;
    `);
    await queryRunner.query(`
      UPDATE transaction_issue_item tii
      SET issue_id = ti.issue_id
      FROM transaction_issue ti
      WHERE tii.transaction_id = ti.id;
    `);
    await queryRunner.query(`
      UPDATE report r
      SET project_id = s.project_id
      FROM schedule s
      WHERE r.project_id IS NULL
      AND r.schedule_id = s.id;
    `);
    await queryRunner.query(`
      UPDATE procurement_issue pi
      SET project_id = i.project_id
      FROM issue i
      WHERE pi.issue_id = i.id;
    `);
    await queryRunner.query(`
      UPDATE kickoff_issue ki
      SET project_id = i.project_id
      FROM issue i
      WHERE ki.issue_id = i.id;
    `);
    await queryRunner.query(`
      UPDATE contract_issue ci
      SET project_id = i.project_id
      FROM issue i
      WHERE ci.issue_id = i.id;
    `);
    await queryRunner.query(`
      UPDATE transaction_issue ti
      SET project_id = i.project_id
      FROM issue i
      WHERE ti.issue_id = i.id;
    `);
    await queryRunner.query(`
      UPDATE payment_issue pi
      SET project_id = i.project_id
      FROM issue i
      WHERE pi.issue_id = i.id;
    `);
    await queryRunner.query(`
      UPDATE declaration_issue di
      SET project_id = i.project_id
      FROM issue i
      WHERE di.issue_id = i.id;
    `);
    await queryRunner.query(
      `ALTER TABLE "contract_issue_item" DROP COLUMN "contract_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue_item" DROP COLUMN "currency_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" DROP COLUMN "transaction_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" DROP COLUMN "currency_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue" DROP CONSTRAINT "REL_e2da521c9fad0f5ed5c6f89259"`,
    );
    await queryRunner.query(
      `ALTER TABLE "declaration_issue" DROP CONSTRAINT "FK_f3671341544605c111c8c62a3b1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "declaration_issue" DROP CONSTRAINT "REL_f3671341544605c111c8c62a3b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" ADD CONSTRAINT "FK_cfc0726a4fc592b32b12af66ce5" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue_item" ADD CONSTRAINT "FK_ca8e0354423942d9dc435cfd95d" FOREIGN KEY ("issue_id") REFERENCES "issue"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" ADD CONSTRAINT "FK_85da1c63431025a340738318226" FOREIGN KEY ("issue_id") REFERENCES "issue"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue" ADD CONSTRAINT "FK_e2da521c9fad0f5ed5c6f892594" FOREIGN KEY ("issue_id") REFERENCES "issue"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue" ADD CONSTRAINT "FK_493e67b42e15708d3e7f38ae228" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kickoff_issue" ADD CONSTRAINT "FK_b9cdcb8d5a1b2235686074d327a" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" ADD CONSTRAINT "FK_34bfbb937675a502b547dab14af" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" ADD CONSTRAINT "FK_2feaef29daad911d5d2a59bfe83" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" ADD CONSTRAINT "FK_d532e413d2ab8e9e05a7bee652e" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" ADD CONSTRAINT "FK_721a593155673fa035c8f81f8f2" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_issue" ADD CONSTRAINT "FK_4133e3fc6d2db6dfd8ff59a95be" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "declaration_issue" ADD CONSTRAINT "FK_f3671341544605c111c8c62a3b1" FOREIGN KEY ("issue_id") REFERENCES "issue"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "declaration_issue" ADD CONSTRAINT "FK_74f9e612dda31cd5b60725a4e52" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue" ADD CONSTRAINT "FK_c5c1ee47a932087585aab345d4c" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "FK_c72d76e480d7334858782543610" FOREIGN KEY ("client_id") REFERENCES "project_client"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" DROP CONSTRAINT "FK_c72d76e480d7334858782543610"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue" DROP CONSTRAINT "FK_c5c1ee47a932087585aab345d4c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "declaration_issue" DROP CONSTRAINT "FK_74f9e612dda31cd5b60725a4e52"`,
    );
    await queryRunner.query(
      `ALTER TABLE "declaration_issue" DROP CONSTRAINT "FK_f3671341544605c111c8c62a3b1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_issue" DROP CONSTRAINT "FK_4133e3fc6d2db6dfd8ff59a95be"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" DROP CONSTRAINT "FK_721a593155673fa035c8f81f8f2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" DROP CONSTRAINT "FK_d532e413d2ab8e9e05a7bee652e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" DROP CONSTRAINT "FK_2feaef29daad911d5d2a59bfe83"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" DROP CONSTRAINT "FK_34bfbb937675a502b547dab14af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kickoff_issue" DROP CONSTRAINT "FK_b9cdcb8d5a1b2235686074d327a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue" DROP CONSTRAINT "FK_493e67b42e15708d3e7f38ae228"`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue" DROP CONSTRAINT "FK_e2da521c9fad0f5ed5c6f892594"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" DROP CONSTRAINT "FK_85da1c63431025a340738318226"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue_item" DROP CONSTRAINT "FK_ca8e0354423942d9dc435cfd95d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" DROP CONSTRAINT "FK_cfc0726a4fc592b32b12af66ce5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "declaration_issue" ADD CONSTRAINT "REL_f3671341544605c111c8c62a3b" UNIQUE ("issue_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "declaration_issue" ADD CONSTRAINT "FK_f3671341544605c111c8c62a3b1" FOREIGN KEY ("issue_id") REFERENCES "issue"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue" ADD CONSTRAINT "REL_e2da521c9fad0f5ed5c6f89259" UNIQUE ("issue_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue" ADD CONSTRAINT "FK_e2da521c9fad0f5ed5c6f892594" FOREIGN KEY ("issue_id") REFERENCES "issue"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "schedule" ALTER COLUMN "url" SET DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_report" ALTER COLUMN "is_deducted" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_report" ALTER COLUMN "is_deducted" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "declaration_issue" DROP COLUMN "project_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_issue" DROP COLUMN "project_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" DROP COLUMN "currency_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" DROP CONSTRAINT "UQ_d532e413d2ab8e9e05a7bee652e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" DROP COLUMN "project_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" DROP COLUMN "currency_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" DROP CONSTRAINT "UQ_34bfbb937675a502b547dab14af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" DROP COLUMN "project_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kickoff_issue" DROP COLUMN "project_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue" DROP COLUMN "project_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" DROP COLUMN "issue_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" DROP COLUMN "paid_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" DROP COLUMN "is_paid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" DROP COLUMN "ratio"`,
    );
    await queryRunner.query(`
      ALTER TABLE "transaction_issue_item"
      ALTER COLUMN "note" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "transaction_issue_item"
      ALTER COLUMN "isPaid" SET NOT NULL
    `);
    await queryRunner.query(
      `ALTER TABLE "contract_issue_item" DROP COLUMN "issue_id"`,
    );
    await queryRunner.query(`ALTER TABLE "report" DROP COLUMN "project_id"`);
    await queryRunner.query(
      `ALTER TABLE "issue_category" ADD "charge_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" ADD "currency_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" ADD "transaction_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue_item" ADD "currency_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue_item" ADD "contract_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "fk_c72d76e480d7334858782543610" FOREIGN KEY ("client_id") REFERENCES "project_client"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue_category" ADD CONSTRAINT "FK_e1865bfaa9307e379bebee48c3c" FOREIGN KEY ("charge_id") REFERENCES "issue_category_charge"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue" ADD CONSTRAINT "FK_c5c1ee47a932087585aab345d4c" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" ADD CONSTRAINT "FK_4d45e4e1243f0d2def43ce3e646" FOREIGN KEY ("transaction_id") REFERENCES "transaction_issue"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" ADD CONSTRAINT "FK_4d66e66a96775b53b457785da46" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue_item" ADD CONSTRAINT "FK_63b2dcbf4eedf7615b869411957" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue_item" ADD CONSTRAINT "FK_8b6010fe7069ab19fa33f56bfba" FOREIGN KEY ("contract_id") REFERENCES "contract_issue"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}

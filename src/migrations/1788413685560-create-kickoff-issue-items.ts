import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKickoffIssueItems1788413685560 implements MigrationInterface {
  name = 'CreateKickoffIssueItems1788413685560';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "kickoff_issue_trip_item_category" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_2b21b211bc92e701844c721c5f6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "kickoff_issue_trip_item" ("id" SERIAL NOT NULL, "days" integer NOT NULL, "note" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "category_id" integer, "kickoff_id" integer, CONSTRAINT "PK_53b4712a761cd74dbbecdd6d734" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "kickoff_issue_participant_item" ("id" SERIAL NOT NULL, "role" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "kickoff_id" integer, "participant_id" integer, CONSTRAINT "PK_fbf49d051a9baaea31ac231725d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_exchange_rate" ALTER COLUMN "applied_date" TYPE date USING "applied_date"::date`,
    );
    await queryRunner.query(
      `ALTER TABLE "kickoff_issue_trip_item" ADD CONSTRAINT "FK_2b21b211bc92e701844c721c5f6" FOREIGN KEY ("category_id") REFERENCES "kickoff_issue_trip_item_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kickoff_issue_trip_item" ADD CONSTRAINT "FK_835dcec5bcce8c6048c31245be3" FOREIGN KEY ("kickoff_id") REFERENCES "kickoff_issue"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kickoff_issue_participant_item" ADD CONSTRAINT "FK_335bbb484f6144dd9695b2d0e41" FOREIGN KEY ("kickoff_id") REFERENCES "kickoff_issue"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "kickoff_issue_participant_item" ADD CONSTRAINT "FK_e742ca02a4251e60a29998af7b3" FOREIGN KEY ("participant_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "kickoff_issue_participant_item" DROP CONSTRAINT "FK_e742ca02a4251e60a29998af7b3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kickoff_issue_participant_item" DROP CONSTRAINT "FK_335bbb484f6144dd9695b2d0e41"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kickoff_issue_trip_item" DROP CONSTRAINT "FK_835dcec5bcce8c6048c31245be3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kickoff_issue_trip_item" DROP CONSTRAINT "FK_2b21b211bc92e701844c721c5f6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_exchange_rate" ALTER COLUMN "applied_date" TYPE TIMESTAMP USING "applied_date"::timestamp`,
    );
    await queryRunner.query(`DROP TABLE "kickoff_issue_participant_item"`);
    await queryRunner.query(`DROP TABLE "kickoff_issue_trip_item"`);
    await queryRunner.query(`DROP TABLE "kickoff_issue_trip_item_category"`);
  }
}

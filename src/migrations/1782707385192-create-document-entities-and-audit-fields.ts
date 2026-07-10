import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentEntitiesAndAuditFields1782707385192 implements MigrationInterface {
  name = 'CreateDocumentEntitiesAndAuditFields1782707385192';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_department_closure" DROP CONSTRAINT "FK_c1b47b84987bff4b25d0753d5c2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_department_closure" DROP CONSTRAINT "FK_113eba2e43ab03993bcbaecf800"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_client_closure" DROP CONSTRAINT "FK_53169f0b3d6b22409294f0c894a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_client_closure" DROP CONSTRAINT "FK_4b9ef0379e8e348849541630e5d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" DROP CONSTRAINT "FK_c6686efa4cd49fa9a429f01bac8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue" DROP CONSTRAINT "FK_2067bb78ce5b812013d3c68357a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP CONSTRAINT "FK_1cf56b10b23971cfd07e4fc6126"`,
    );
    await queryRunner.query(
      `CREATE TABLE "document_attachment" ("id" SERIAL NOT NULL, "filename" character varying NOT NULL, "size" integer NOT NULL, "path" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "document_id" integer, CONSTRAINT "PK_31fde0758c034d40a6fd46eff86" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "document" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "content" text NOT NULL, "fixed" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "folder_id" integer, "created_by_id" integer, "updated_by_id" integer, CONSTRAINT "PK_e57d3357f83f3cdc0acffc3d777" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "document_folder_closure" ("ancestor" integer NOT NULL, "descendant" integer NOT NULL, "depth" integer NOT NULL, CONSTRAINT "PK_a062a9b50793bb9760717ac646e" PRIMARY KEY ("ancestor", "descendant"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "document_folder" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "fixed" boolean NOT NULL DEFAULT false, "sort" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_6ce8d99320473f889fdf21ad2f4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" RENAME COLUMN "user_id" TO "created_by_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue" RENAME COLUMN "user_id" TO "created_by_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" RENAME COLUMN "user_id" TO "created_by_id"`,
    );
    await queryRunner.query(`ALTER TABLE "report" ADD "updated_by_id" integer`);
    await queryRunner.query(`ALTER TABLE "issue" ADD "updated_by_id" integer`);
    await queryRunner.query(
      `ALTER TABLE "project" ADD "updated_by_id" integer`,
    );
    await queryRunner.query(
      `UPDATE "report" SET "updated_by_id" = "created_by_id" WHERE "updated_by_id" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "issue" SET "updated_by_id" = "created_by_id" WHERE "updated_by_id" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "project" SET "updated_by_id" = "created_by_id" WHERE "updated_by_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_department_closure" ADD CONSTRAINT "FK_c1b47b84987bff4b25d0753d5c2" FOREIGN KEY ("ancestor") REFERENCES "user_department"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_department_closure" ADD CONSTRAINT "FK_113eba2e43ab03993bcbaecf800" FOREIGN KEY ("descendant") REFERENCES "user_department"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_client_closure" ADD CONSTRAINT "FK_4b9ef0379e8e348849541630e5d" FOREIGN KEY ("ancestor") REFERENCES "project_client"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_client_closure" ADD CONSTRAINT "FK_53169f0b3d6b22409294f0c894a" FOREIGN KEY ("descendant") REFERENCES "project_client"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_attachment" ADD CONSTRAINT "FK_1de22abc4f9e25fbe0a637578d8" FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" ADD CONSTRAINT "FK_6ce8d99320473f889fdf21ad2f4" FOREIGN KEY ("folder_id") REFERENCES "document_folder"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" ADD CONSTRAINT "FK_76d5a96bee238e323f74ebe4e7a" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" ADD CONSTRAINT "FK_fe8bb19f00a0aa6b9ab4aa0bfc7" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_folder_closure" ADD CONSTRAINT "FK_082660186f22fd4b7765b72a48e" FOREIGN KEY ("ancestor") REFERENCES "document_folder"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_folder_closure" ADD CONSTRAINT "FK_a7d0c15446a3fd684d48a0c3e1c" FOREIGN KEY ("descendant") REFERENCES "document_folder"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" ADD CONSTRAINT "FK_d2b99879f78e80001b7e50fcd68" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" ADD CONSTRAINT "FK_85667c06eda305d745c92540b87" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue" ADD CONSTRAINT "FK_87dc164f246973f7e124962a592" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue" ADD CONSTRAINT "FK_16204b6def81ca2d74a7e878cf6" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "FK_e155d8f98ec858daa457d6ff291" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "FK_1f3c2190a7a8185fb02bf1132ce" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" DROP CONSTRAINT "FK_1f3c2190a7a8185fb02bf1132ce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP CONSTRAINT "FK_e155d8f98ec858daa457d6ff291"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue" DROP CONSTRAINT "FK_16204b6def81ca2d74a7e878cf6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue" DROP CONSTRAINT "FK_87dc164f246973f7e124962a592"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" DROP CONSTRAINT "FK_85667c06eda305d745c92540b87"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" DROP CONSTRAINT "FK_d2b99879f78e80001b7e50fcd68"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_folder_closure" DROP CONSTRAINT "FK_a7d0c15446a3fd684d48a0c3e1c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_folder_closure" DROP CONSTRAINT "FK_082660186f22fd4b7765b72a48e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" DROP CONSTRAINT "FK_fe8bb19f00a0aa6b9ab4aa0bfc7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" DROP CONSTRAINT "FK_76d5a96bee238e323f74ebe4e7a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" DROP CONSTRAINT "FK_6ce8d99320473f889fdf21ad2f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_attachment" DROP CONSTRAINT "FK_1de22abc4f9e25fbe0a637578d8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_client_closure" DROP CONSTRAINT "FK_53169f0b3d6b22409294f0c894a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_client_closure" DROP CONSTRAINT "FK_4b9ef0379e8e348849541630e5d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_department_closure" DROP CONSTRAINT "FK_113eba2e43ab03993bcbaecf800"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_department_closure" DROP CONSTRAINT "FK_c1b47b84987bff4b25d0753d5c2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN "updated_by_id"`,
    );
    await queryRunner.query(`ALTER TABLE "issue" DROP COLUMN "updated_by_id"`);
    await queryRunner.query(`ALTER TABLE "report" DROP COLUMN "updated_by_id"`);
    await queryRunner.query(
      `ALTER TABLE "project" RENAME COLUMN "created_by_id" TO "user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue" RENAME COLUMN "created_by_id" TO "user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" RENAME COLUMN "created_by_id" TO "user_id"`,
    );
    await queryRunner.query(`DROP TABLE "document_folder"`);
    await queryRunner.query(`DROP TABLE "document_folder_closure"`);
    await queryRunner.query(`DROP TABLE "document"`);
    await queryRunner.query(`DROP TABLE "document_attachment"`);
    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "FK_1cf56b10b23971cfd07e4fc6126" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue" ADD CONSTRAINT "FK_2067bb78ce5b812013d3c68357a" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" ADD CONSTRAINT "FK_c6686efa4cd49fa9a429f01bac8" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_client_closure" ADD CONSTRAINT "FK_4b9ef0379e8e348849541630e5d" FOREIGN KEY ("ancestor") REFERENCES "project_client"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_client_closure" ADD CONSTRAINT "FK_53169f0b3d6b22409294f0c894a" FOREIGN KEY ("descendant") REFERENCES "project_client"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_department_closure" ADD CONSTRAINT "FK_113eba2e43ab03993bcbaecf800" FOREIGN KEY ("descendant") REFERENCES "user_department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_department_closure" ADD CONSTRAINT "FK_c1b47b84987bff4b25d0753d5c2" FOREIGN KEY ("ancestor") REFERENCES "user_department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}

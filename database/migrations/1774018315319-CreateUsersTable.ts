import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const TABLE_NAME = 'users';

export class CreateUsersTable1774018315319 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_NAME,
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
            // unsigned: true, -- PostgreSQL nao suporta unsigned integers
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'password',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
    );

    // Partial unique index: email unico apenas entre registros ativos (deleted_at IS NULL).
    // Unique(['email', 'deleted_at']) nao funciona pq PostgreSQL trata NULL como distinto.
    await queryRunner.createIndex(
      TABLE_NAME,
      new TableIndex({
        name: 'UQ_users_email_active',
        columnNames: ['email'],
        isUnique: true,
        where: '"deleted_at" IS NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(TABLE_NAME, 'UQ_users_email_active');
    await queryRunner.dropTable(TABLE_NAME);
  }
}

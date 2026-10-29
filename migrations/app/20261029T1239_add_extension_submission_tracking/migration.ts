#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5f777a6d98c8366bd9a99b60a2c7b53b4934ff6e8d4c660bf4924e72b5beb2e8/contract';
import endContract from '../../snapshots/5f777a6d98c8366bd9a99b60a2c7b53b4934ff6e8d4c660bf4924e72b5beb2e8/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/6eebf89a2f6c64f53e5744e58b8c0ce02377716ce22f52afc87b67bd8032adbc/contract';
import startContract from '../../snapshots/6eebf89a2f6c64f53e5744e58b8c0ce02377716ce22f52afc87b67bd8032adbc/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'extensionVersion',
        column: col('artifactUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'extensionVersion',
        column: col('reviewedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'extensionVersion',
        column: col('reviewedById', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'extensionVersion',
        column: col('submittedById', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'extensionVersion',
        index: 'extensionVersion_reviewedById_idx_e2835478',
        columns: ['reviewedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'extensionVersion',
        index: 'extensionVersion_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'extensionVersion',
        index: 'extensionVersion_submittedById_idx_89341c73',
        columns: ['submittedById'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'extensionVersion',
        foreignKey: {
          name: 'extensionVersion_reviewedById_fkey',
          columns: ['reviewedById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'extensionVersion',
        foreignKey: {
          name: 'extensionVersion_submittedById_fkey',
          columns: ['submittedById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

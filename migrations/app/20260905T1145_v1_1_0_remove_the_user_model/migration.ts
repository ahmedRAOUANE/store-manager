#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/c773c013872ab6c7738c9654f14006462d0548dee862f68476f9d2ef8cb99560/contract';
import endContract from '../../snapshots/c773c013872ab6c7738c9654f14006462d0548dee862f68476f9d2ef8cb99560/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d53ad0735048d093023b9d63153a5bf5b58cf8351a2c572feb8f4c02a4aad921/contract';
import startContract from '../../snapshots/d53ad0735048d093023b9d63153a5bf5b58cf8351a2c572feb8f4c02a4aad921/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({
        schema: 'public',
        table: 'purchase',
        constraint: 'purchase_createdById_fkey',
        kind: 'foreignKey',
      }),
      this.dropIndex({
        schema: 'public',
        table: 'purchase',
        index: 'purchase_createdById_idx_8bf640ed',
      }),
      this.dropColumn({ schema: 'public', table: 'purchase', column: 'createdById' }),
      this.dropTable({ schema: 'public', table: 'user' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

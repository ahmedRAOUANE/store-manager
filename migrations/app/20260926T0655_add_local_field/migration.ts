#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3e8430f20b705a90ac4ddb6011ea11dd03221512887f21e23be5b6bd026ece45/contract';
import endContract from '../../snapshots/3e8430f20b705a90ac4ddb6011ea11dd03221512887f21e23be5b6bd026ece45/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/55035a0476e348d870418c8d93ebbe55a69fe0d70911c81bf2b10b9338b4d23c/contract';
import startContract from '../../snapshots/55035a0476e348d870418c8d93ebbe55a69fe0d70911c81bf2b10b9338b4d23c/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('locale', 'text', {
          notNull: true,
          default: lit('en'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

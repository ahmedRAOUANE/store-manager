#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5d2aa3d74fd1b177ba9d85fbfbd46ed1a1d246bdb7c0ff94c7ef7ddf75b30eba/contract';
import endContract from '../../snapshots/5d2aa3d74fd1b177ba9d85fbfbd46ed1a1d246bdb7c0ff94c7ef7ddf75b30eba/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/5f777a6d98c8366bd9a99b60a2c7b53b4934ff6e8d4c660bf4924e72b5beb2e8/contract';
import startContract from '../../snapshots/5f777a6d98c8366bd9a99b60a2c7b53b4934ff6e8d4c660bf4924e72b5beb2e8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'extensionVersion',
        column: col('staticAnalysisReport', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

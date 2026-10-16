#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/605402d4e74a1207f0b0bb9c27205db28e2906a6e8f743692d854638505a3104/contract';
import endContract from '../../snapshots/605402d4e74a1207f0b0bb9c27205db28e2906a6e8f743692d854638505a3104/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d4b38c049bb927a3c0f2d901e0be5cad24b1bfd59e95be5a7fa66bb35c6f4c61/contract';
import startContract from '../../snapshots/d4b38c049bb927a3c0f2d901e0be5cad24b1bfd59e95be5a7fa66bb35c6f4c61/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'notification',
        constraint: 'notification_type_check_4dbfd761',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

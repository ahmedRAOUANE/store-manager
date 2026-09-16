#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/88ab2295f7a30e203499e3204929446cc9c6c77931ecaed24e2be534c69180cb/contract';
import startContract from '../../snapshots/88ab2295f7a30e203499e3204929446cc9c6c77931ecaed24e2be534c69180cb/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ccf0fb1d91f8349e43d8d5aecafc8582aaabe767ce4a3d438d0b7683dbadc64e/contract';
import endContract from '../../snapshots/ccf0fb1d91f8349e43d8d5aecafc8582aaabe767ce4a3d438d0b7683dbadc64e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, rawSql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      rawSql({
        id: 'custom.purchase_invoice_number_sequence',
        label: 'Create purchase invoice sequence and generator function',
        operationClass: 'additive',
        target: { id: 'postgres' },
        precheck: [],
        execute: [
          {
            description: 'create purchase_invoice_seq sequence and generate_invoice_number function',
            sql: `
              CREATE SEQUENCE IF NOT EXISTS purchase_invoice_seq START WITH 1 INCREMENT BY 1;

              CREATE OR REPLACE FUNCTION generate_invoice_number()
              RETURNS text AS $$
              BEGIN
                  RETURN 'INV-' || LPAD(nextval('purchase_invoice_seq')::text, 6, '0');
              END;
              $$ LANGUAGE plpgsql;
            `,
          },
        ],
        postcheck: [],
      }),
      this.setNotNull({ schema: 'public', table: 'purchase', column: 'invoiceNumber' }),
      this.setDefault({
        schema: 'public',
        table: 'purchase',
        column: 'invoiceNumber',
        defaultSql: 'DEFAULT (generate_invoice_number())',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

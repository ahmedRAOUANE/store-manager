#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/88ab2295f7a30e203499e3204929446cc9c6c77931ecaed24e2be534c69180cb/contract';
import endContract from '../../snapshots/88ab2295f7a30e203499e3204929446cc9c6c77931ecaed24e2be534c69180cb/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c773c013872ab6c7738c9654f14006462d0548dee862f68476f9d2ef8cb99560/contract';
import startContract from '../../snapshots/c773c013872ab6c7738c9654f14006462d0548dee862f68476f9d2ef8cb99560/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, rawSql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      rawSql({
        id: 'custom.product_sku_sequence',
        label: 'Create product SKU sequence and generator function',
        operationClass: 'additive',
        target: { id: 'postgres' },
        precheck: [],
        execute: [
          {
            description: 'create product_sku_seq sequence and generate_prd_sku function',
            sql: `
              CREATE SEQUENCE IF NOT EXISTS product_sku_seq START WITH 1 INCREMENT BY 1;

              CREATE OR REPLACE FUNCTION generate_prd_sku()
              RETURNS text AS $$
              BEGIN
                  RETURN 'PRD-' || LPAD(nextval('product_sku_seq')::text, 6, '0');
              END;
              $$ LANGUAGE plpgsql;
            `,
          },
        ],
        postcheck: [],
      }),
      this.setDefault({
        schema: 'public',
        table: 'product',
        column: 'sku',
        defaultSql: 'DEFAULT (generate_prd_sku())',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

#!/usr/bin/env -S node
import { sql } from '@prisma/orm-postgres/builder/runtime';
import type { Contract as End } from '../../snapshots/3700fcfda241ce951069ee33d698895e965b7fba631f08b6874c377c7460822f/contract';
import endContractJson from '../../snapshots/3700fcfda241ce951069ee33d698895e965b7fba631f08b6874c377c7460822f/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ccf0fb1d91f8349e43d8d5aecafc8582aaabe767ce4a3d438d0b7683dbadc64e/contract';
import startContract from '../../snapshots/ccf0fb1d91f8349e43d8d5aecafc8582aaabe767ce4a3d438d0b7683dbadc64e/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';
import { createExecutionContext, createSqlExecutionStack } from '@prisma/orm-postgres/family-runtime';
import postgresAdapter from '@prisma/orm-postgres/adapter/runtime';
import {
  PostgresContractSerializer,
  default as postgresTarget,
} from '@prisma/orm-postgres/target/runtime';
import { Temporal } from 'temporal-polyfill';

globalThis.Temporal = Temporal;

const endContract = new PostgresContractSerializer().deserializeContract(endContractJson);

const db = sql<End>({
  context: createExecutionContext({
    contract: endContract,
    stack: createSqlExecutionStack({
      target: postgresTarget,
      adapter: postgresAdapter,
    }),
  }),
});

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContractJson;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'storeMembership',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('storeId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'storeMembership_role_check_6fc3012b',
            "\"role\" IN ('OWNER', 'MANAGER', 'STAFF')",
          ),
          checkExpression(
            'storeMembership_status_check_767350ca',
            "\"status\" IN ('PENDING', 'ACTIVE', 'REJECTED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('firstName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('globalRole', 'text', {
            notNull: true,
            default: lit('USER'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('imageUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('kindeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('user_globalRole_check_ac6ca7bf', "\"globalRole\" IN ('ADMIN', 'USER')"),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'purchase',
        column: col('createdById', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'store',
        column: col('status', 'text', {
          notNull: true,
          default: lit('PENDING'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'purchaseItem',
        column: col('lineSubtotal', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.dataTransform(endContract, 'backfill-purchaseItem-lineSubtotal', {
        check: () =>
          db.public.purchaseItem
            .select('id')
            .where((f, fns) => fns.eq(f.lineSubtotal, null))
            .limit(1),

        run: () =>
          db.public.purchaseItem
            .update((f, fns) => ({
              lineSubtotal: fns
                .raw`${f.quantity} * ${f.unitCost}`
                .returns('pg/float8@1'),
            }))
            .where((f, fns) => fns.eq(f.lineSubtotal, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'purchaseItem', column: 'lineSubtotal' }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'store',
        constraint: 'store_status_check_7c5ddd00',
        expression: "\"status\" IN ('PENDING', 'ACTIVE', 'SUSPENDED')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'storeMembership',
        constraint: 'storeMembership_userId_storeId_key',
        columns: ['userId', 'storeId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_kindeId_key',
        columns: ['kindeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'purchase',
        index: 'purchase_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'store',
        index: 'store_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'storeMembership',
        index: 'storeMembership_storeId_idx_c545737d',
        columns: ['storeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'storeMembership',
        index: 'storeMembership_storeId_status_idx_81db0ee8',
        columns: ['storeId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'storeMembership',
        index: 'storeMembership_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'user',
        index: 'user_email_idx_46df9cad',
        columns: ['email'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'storeMembership',
        foreignKey: {
          name: 'storeMembership_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'storeMembership',
        foreignKey: {
          name: 'storeMembership_storeId_fkey',
          columns: ['storeId'],
          references: { schema: 'public', table: 'store', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'purchase',
        foreignKey: {
          name: 'purchase_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

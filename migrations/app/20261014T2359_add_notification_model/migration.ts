#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/3e8430f20b705a90ac4ddb6011ea11dd03221512887f21e23be5b6bd026ece45/contract';
import startContract from '../../snapshots/3e8430f20b705a90ac4ddb6011ea11dd03221512887f21e23be5b6bd026ece45/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d4b38c049bb927a3c0f2d901e0be5cad24b1bfd59e95be5a7fa66bb35c6f4c61/contract';
import endContract from '../../snapshots/d4b38c049bb927a3c0f2d901e0be5cad24b1bfd59e95be5a7fa66bb35c6f4c61/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'notification',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('payload', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('readAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('recipientId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('storeId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'notification_type_check_4dbfd761',
            "\"type\" IN ('STORE_ACTIVATED', 'STORE_SUSPENDED', 'MEMBERSHIP_ACCEPTED', 'MEMBERSHIP_REJECTED', 'MEMBER_ROLE_CHANGED', 'MEMBERSHIP_INVALIDATED', 'PRODUCT_LOW_STOCK')",
          ),
        ],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_recipientId_createdAt_idx_4cb575bd',
        columns: ['recipientId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_recipientId_idx_c9527cf8',
        columns: ['recipientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_recipientId_readAt_createdAt_idx_d10a34e2',
        columns: ['recipientId', 'readAt', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_storeId_idx_c545737d',
        columns: ['storeId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notification',
        foreignKey: {
          name: 'notification_recipientId_fkey',
          columns: ['recipientId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notification',
        foreignKey: {
          name: 'notification_storeId_fkey',
          columns: ['storeId'],
          references: { schema: 'public', table: 'store', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

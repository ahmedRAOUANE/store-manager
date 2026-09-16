#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/3700fcfda241ce951069ee33d698895e965b7fba631f08b6874c377c7460822f/contract';
import startContract from '../../snapshots/3700fcfda241ce951069ee33d698895e965b7fba631f08b6874c377c7460822f/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/55035a0476e348d870418c8d93ebbe55a69fe0d70911c81bf2b10b9338b4d23c/contract';
import endContract from '../../snapshots/55035a0476e348d870418c8d93ebbe55a69fe0d70911c81bf2b10b9338b4d23c/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'storeMembership',
        constraint: 'storeMembership_status_check_767350ca',
      }),
      this.createTable({
        schema: 'public',
        table: 'sale',
        columns: [
          col('amountDue', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('amountPaid', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('discountAmount', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('invoiceNumber', 'text', {
            notNull: true,
            default: fn('generate_invoice_number()'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('saleDate', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('storeId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('subtotal', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('taxAmount', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('totalAmount', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'saleItem',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('discountAmount', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('lineSubtotal', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('productId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('quantity', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('saleId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('taxAmount', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('totalAmount', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('totalCost', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('unitCost', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('unitPrice', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.setDefault({
        schema: 'public',
        table: 'store',
        column: 'currency',
        defaultSql: "DEFAULT 'DZ'",
        operationClass: 'widening',
      }),
      this.addUnique({
        schema: 'public',
        table: 'sale',
        constraint: 'sale_storeId_invoiceNumber_key',
        columns: ['storeId', 'invoiceNumber'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'storeMembership',
        constraint: 'storeMembership_status_check_596321b2',
        expression: "\"status\" IN ('PENDING', 'ACTIVE', 'REJECTED', 'INVALIDATED')",
      }),
      this.createIndex({
        schema: 'public',
        table: 'sale',
        index: 'sale_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sale',
        index: 'sale_saleDate_idx_a181b758',
        columns: ['saleDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sale',
        index: 'sale_storeId_idx_c545737d',
        columns: ['storeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sale',
        index: 'sale_storeId_saleDate_idx_1ad92b78',
        columns: ['storeId', 'saleDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'saleItem',
        index: 'saleItem_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'saleItem',
        index: 'saleItem_saleId_idx_b4c0fb73',
        columns: ['saleId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'sale',
        foreignKey: {
          name: 'sale_storeId_fkey',
          columns: ['storeId'],
          references: { schema: 'public', table: 'store', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'sale',
        foreignKey: {
          name: 'sale_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'saleItem',
        foreignKey: {
          name: 'saleItem_saleId_fkey',
          columns: ['saleId'],
          references: { schema: 'public', table: 'sale', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'saleItem',
        foreignKey: {
          name: 'saleItem_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'product', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

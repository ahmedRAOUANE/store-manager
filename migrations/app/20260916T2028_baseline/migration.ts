#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/55035a0476e348d870418c8d93ebbe55a69fe0d70911c81bf2b10b9338b4d23c/contract';
import endContract from '../../snapshots/55035a0476e348d870418c8d93ebbe55a69fe0d70911c81bf2b10b9338b4d23c/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  rawSql
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
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
      this.createTable({
        schema: 'public',
        table: 'product',
        columns: [
          col('averageCost', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('barcode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('minimumStock', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sellingPrice', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('sku', 'text', {
            notNull: true,
            default: fn('generate_prd_sku()'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('stockQuantity', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('storeId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('unit', 'text', {
            notNull: true,
            default: lit('piece'),
            codecRef: { codecId: 'pg/text@1' },
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
        table: 'purchase',
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
          col('createdById', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
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
          col('otherCost', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('purchaseDate', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('shippingCost', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('storeId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('subtotal', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('supplierId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
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
        table: 'purchaseItem',
        columns: [
          col('batchNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
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
          col('expiryDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('lineSubtotal', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('productId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('purchaseId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('quantity', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('taxAmount', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('totalAmount', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('unitCost', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
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
      this.createTable({
        schema: 'public',
        table: 'store',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('currency', 'text', {
            notNull: true,
            default: lit('DZ'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('timezone', 'text', {
            notNull: true,
            default: lit('UTC'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'store_status_check_7c5ddd00',
            "\"status\" IN ('PENDING', 'ACTIVE', 'SUSPENDED')",
          ),
        ],
      }),
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
            'storeMembership_status_check_596321b2',
            "\"status\" IN ('PENDING', 'ACTIVE', 'REJECTED', 'INVALIDATED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'supplier',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('storeId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('taxNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
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
      this.addUnique({
        schema: 'public',
        table: 'product',
        constraint: 'product_storeId_sku_key',
        columns: ['storeId', 'sku'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'product',
        constraint: 'product_storeId_barcode_key',
        columns: ['storeId', 'barcode'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'purchase',
        constraint: 'purchase_storeId_invoiceNumber_key',
        columns: ['storeId', 'invoiceNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'sale',
        constraint: 'sale_storeId_invoiceNumber_key',
        columns: ['storeId', 'invoiceNumber'],
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
        table: 'product',
        index: 'product_storeId_idx_c545737d',
        columns: ['storeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product',
        index: 'product_storeId_name_idx_2db06943',
        columns: ['storeId', 'name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'purchase',
        index: 'purchase_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'purchase',
        index: 'purchase_purchaseDate_idx_61da369f',
        columns: ['purchaseDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'purchase',
        index: 'purchase_storeId_idx_c545737d',
        columns: ['storeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'purchase',
        index: 'purchase_storeId_purchaseDate_idx_57c0c2bc',
        columns: ['storeId', 'purchaseDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'purchase',
        index: 'purchase_supplierId_idx_c4d9a8b9',
        columns: ['supplierId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'purchaseItem',
        index: 'purchaseItem_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'purchaseItem',
        index: 'purchaseItem_purchaseId_idx_10cddd2f',
        columns: ['purchaseId'],
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
        table: 'supplier',
        index: 'supplier_storeId_idx_c545737d',
        columns: ['storeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'supplier',
        index: 'supplier_storeId_name_idx_2db06943',
        columns: ['storeId', 'name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'user',
        index: 'user_email_idx_46df9cad',
        columns: ['email'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product',
        foreignKey: {
          name: 'product_storeId_fkey',
          columns: ['storeId'],
          references: { schema: 'public', table: 'store', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'purchase',
        foreignKey: {
          name: 'purchase_storeId_fkey',
          columns: ['storeId'],
          references: { schema: 'public', table: 'store', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'purchase',
        foreignKey: {
          name: 'purchase_supplierId_fkey',
          columns: ['supplierId'],
          references: { schema: 'public', table: 'supplier', columns: ['id'] },
          onDelete: 'setNull',
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
      this.addForeignKey({
        schema: 'public',
        table: 'purchaseItem',
        foreignKey: {
          name: 'purchaseItem_purchaseId_fkey',
          columns: ['purchaseId'],
          references: { schema: 'public', table: 'purchase', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'purchaseItem',
        foreignKey: {
          name: 'purchaseItem_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'product', columns: ['id'] },
        },
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
        table: 'supplier',
        foreignKey: {
          name: 'supplier_storeId_fkey',
          columns: ['storeId'],
          references: { schema: 'public', table: 'store', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

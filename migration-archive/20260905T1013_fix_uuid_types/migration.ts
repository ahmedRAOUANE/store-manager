import type { Contract as Start } from '../../snapshots/1e8412e162dbbe69f4bb3bf8d07f0280ae67eaab15c34dcf201e67468315428d/contract';
import startContract from '../../snapshots/1e8412e162dbbe69f4bb3bf8d07f0280ae67eaab15c34dcf201e67468315428d/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d53ad0735048d093023b9d63153a5bf5b58cf8351a2c572feb8f4c02a4aad921/contract';
import endContract from '../../snapshots/d53ad0735048d093023b9d63153a5bf5b58cf8351a2c572feb8f4c02a4aad921/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropTable({
        schema: 'public',
        table: 'post',
      }),

      // this.dropDefault({
      //   schema: 'public',
      //   table: 'user',
      //   column: 'id',
      // }),

      this.dropConstraint({
        schema: 'public',
        table: 'user',
        constraint: 'user_pkey',
        kind: 'primaryKey',
      }),

      this.dropDefault({
        schema: 'public',
        table: 'user',
        column: 'id',
      }),

      this.dropColumn({
        schema: 'public',
        table: 'user',
        column: 'id',
      }),

      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('id', 'uuid', {
          notNull: true,
          codecRef: { codecId: 'pg/uuid@1' },
        }),
      }),

      this.addPrimaryKey({
        schema: 'public',
        table: 'user',
        constraint: 'user_pkey',
        columns: ['id'],
      }),

      this.dropColumn({
        schema: 'public',
        table: 'user',
        column: 'username',
      }),

      this.dropConstraint({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
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
          col('barcode', 'text', {
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', {
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
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
          col('name', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('sellingPrice', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('sku', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('stockQuantity', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('storeId', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
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
          col('createdById', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('discountAmount', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('invoiceNumber', 'text', {
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('notes', 'text', {
            codecRef: { codecId: 'pg/text@1' },
          }),
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
          col('storeId', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('subtotal', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('supplierId', 'uuid', {
            codecRef: { codecId: 'pg/uuid@1' },
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
        table: 'purchaseItem',
        columns: [
          col('batchNumber', 'text', {
            codecRef: { codecId: 'pg/text@1' },
          }),
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
          col('expiryDate', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('productId', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('purchaseId', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('quantity', 'float8', {
            notNull: true,
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('taxAmount', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('totalAmount', 'float8', {
            notNull: true,
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('unitCost', 'float8', {
            notNull: true,
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
        table: 'store',
        columns: [
          col('address', 'text', {
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('currency', 'text', {
            notNull: true,
            default: lit('USD'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('description', 'text', {
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('email', 'text', {
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('name', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('phone', 'text', {
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
        constraints: [primaryKey(['id'])],
      }),

      this.createTable({
        schema: 'public',
        table: 'supplier',
        columns: [
          col('address', 'text', {
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', {
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('name', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('notes', 'text', {
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('phone', 'text', {
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('storeId', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('taxNumber', 'text', {
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),

      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('isActive', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),

      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('role', 'text', {
          notNull: true,
          default: lit('EMPLOYEE'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),

      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('password', 'text', {
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),

      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('storeId', 'uuid', {
          codecRef: { codecId: 'pg/uuid@1' },
        }),
      }),

      // this.alterColumnType({
      //   schema: 'public',
      //   table: 'user',
      //   column: 'id',
      //   options: {
      //     qualifiedTargetType: 'uuid',
      //     formatTypeExpected: 'uuid',
      //     rawTargetTypeForLabel: 'uuid',
      //   },
      // }),

      this.setNotNull({
        schema: 'public',
        table: 'user',
        column: 'name',
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

      this.addCheckConstraint({
        schema: 'public',
        table: 'user',
        constraint: 'user_role_check_37999223',
        expression: "\"role\" IN ('OWNER', 'MANAGER', 'EMPLOYEE')",
      }),

      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_storeId_email_key',
        columns: ['storeId', 'email'],
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
        index: 'user_storeId_idx_c545737d',
        columns: ['storeId'],
      }),

      this.addForeignKey({
        schema: 'public',
        table: 'product',
        foreignKey: {
          name: 'product_storeId_fkey',
          columns: ['storeId'],
          references: {
            schema: 'public',
            table: 'store',
            columns: ['id'],
          },
          onDelete: 'cascade',
        },
      }),

      this.addForeignKey({
        schema: 'public',
        table: 'purchase',
        foreignKey: {
          name: 'purchase_storeId_fkey',
          columns: ['storeId'],
          references: {
            schema: 'public',
            table: 'store',
            columns: ['id'],
          },
          onDelete: 'cascade',
        },
      }),

      this.addForeignKey({
        schema: 'public',
        table: 'purchase',
        foreignKey: {
          name: 'purchase_supplierId_fkey',
          columns: ['supplierId'],
          references: {
            schema: 'public',
            table: 'supplier',
            columns: ['id'],
          },
          onDelete: 'setNull',
        },
      }),

      this.addForeignKey({
        schema: 'public',
        table: 'purchase',
        foreignKey: {
          name: 'purchase_createdById_fkey',
          columns: ['createdById'],
          references: {
            schema: 'public',
            table: 'user',
            columns: ['id'],
          },
        },
      }),

      this.addForeignKey({
        schema: 'public',
        table: 'purchaseItem',
        foreignKey: {
          name: 'purchaseItem_purchaseId_fkey',
          columns: ['purchaseId'],
          references: {
            schema: 'public',
            table: 'purchase',
            columns: ['id'],
          },
          onDelete: 'cascade',
        },
      }),

      this.addForeignKey({
        schema: 'public',
        table: 'purchaseItem',
        foreignKey: {
          name: 'purchaseItem_productId_fkey',
          columns: ['productId'],
          references: {
            schema: 'public',
            table: 'product',
            columns: ['id'],
          },
        },
      }),

      this.addForeignKey({
        schema: 'public',
        table: 'supplier',
        foreignKey: {
          name: 'supplier_storeId_fkey',
          columns: ['storeId'],
          references: {
            schema: 'public',
            table: 'store',
            columns: ['id'],
          },
          onDelete: 'cascade',
        },
      }),

      this.addForeignKey({
        schema: 'public',
        table: 'user',
        foreignKey: {
          name: 'user_storeId_fkey',
          columns: ['storeId'],
          references: {
            schema: 'public',
            table: 'store',
            columns: ['id'],
          },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

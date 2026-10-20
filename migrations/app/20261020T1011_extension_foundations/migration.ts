#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/605402d4e74a1207f0b0bb9c27205db28e2906a6e8f743692d854638505a3104/contract';
import startContract from '../../snapshots/605402d4e74a1207f0b0bb9c27205db28e2906a6e8f743692d854638505a3104/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/6eebf89a2f6c64f53e5744e58b8c0ce02377716ce22f52afc87b67bd8032adbc/contract';
import endContract from '../../snapshots/6eebf89a2f6c64f53e5744e58b8c0ce02377716ce22f52afc87b67bd8032adbc/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'extension',
        columns: [
          col('authorName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'extensionData',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('data', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('installId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('tableName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'extensionInstall',
        columns: [
          col('errorReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('extensionId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('installedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('installedById', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('quotaMaxBytes', 'int4', {
            notNull: true,
            default: lit(524288000),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('quotaMaxRows', 'int4', {
            notNull: true,
            default: lit(1000000),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('scope', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('scopeId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('active'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('versionId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'extensionStorage',
        columns: [
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('installId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('value', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'extensionVersion',
        columns: [
          col('artifactChecksum', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('artifactPath', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('extensionId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('manifest', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('publishedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('reviewNotes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('approved'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('version', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'extensionInstall',
        constraint: 'extensionInstall_extensionId_scope_scopeId_key',
        columns: ['extensionId', 'scope', 'scopeId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'extensionStorage',
        constraint: 'extensionStorage_installId_key_key',
        columns: ['installId', 'key'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'extensionVersion',
        constraint: 'extensionVersion_extensionId_version_key',
        columns: ['extensionId', 'version'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'extensionData',
        index: 'extensionData_installId_idx_d6105b3e',
        columns: ['installId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'extensionData',
        index: 'extensionData_installId_tableName_createdAt_idx_cfbb7f8f',
        columns: ['installId', 'tableName', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'extensionData',
        index: 'extensionData_installId_tableName_updatedAt_idx_448cd24c',
        columns: ['installId', 'tableName', 'updatedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'extensionInstall',
        index: 'extensionInstall_extensionId_idx_f089c64f',
        columns: ['extensionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'extensionInstall',
        index: 'extensionInstall_installedById_idx_de87c177',
        columns: ['installedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'extensionInstall',
        index: 'extensionInstall_scope_scopeId_idx_dc8103e8',
        columns: ['scope', 'scopeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'extensionInstall',
        index: 'extensionInstall_versionId_idx_ef8aa804',
        columns: ['versionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'extensionStorage',
        index: 'extensionStorage_installId_idx_d6105b3e',
        columns: ['installId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'extensionVersion',
        index: 'extensionVersion_extensionId_idx_f089c64f',
        columns: ['extensionId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'extensionData',
        foreignKey: {
          name: 'extensionData_installId_fkey',
          columns: ['installId'],
          references: { schema: 'public', table: 'extensionInstall', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'extensionInstall',
        foreignKey: {
          name: 'extensionInstall_extensionId_fkey',
          columns: ['extensionId'],
          references: { schema: 'public', table: 'extension', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'extensionInstall',
        foreignKey: {
          name: 'extensionInstall_versionId_fkey',
          columns: ['versionId'],
          references: { schema: 'public', table: 'extensionVersion', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'extensionInstall',
        foreignKey: {
          name: 'extensionInstall_installedById_fkey',
          columns: ['installedById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'extensionStorage',
        foreignKey: {
          name: 'extensionStorage_installId_fkey',
          columns: ['installId'],
          references: { schema: 'public', table: 'extensionInstall', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'extensionVersion',
        foreignKey: {
          name: 'extensionVersion_extensionId_fkey',
          columns: ['extensionId'],
          references: { schema: 'public', table: 'extension', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

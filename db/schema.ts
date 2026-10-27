import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const proposals = sqliteTable('proposals', { id:text('id').primaryKey(), token:text('token').notNull().unique(), data:text('data').notNull(), createdAt:integer('created_at').notNull(), updatedAt:integer('updated_at').notNull() });
export const settings = sqliteTable('settings', { id:text('id').primaryKey(), data:text('data').notNull() });

export { db, neonQuery, createDb, schema } from './client'
export type { Database } from './client'
/** @deprecated use `Database` */
export type DB = import('./client').Database

// Common Drizzle operators, so consumers import only from '@repo/db'.
export {
    eq, and, or, not, ne, gt, gte, lt, lte, inArray, notInArray, isNull, isNotNull, count, countDistinct, sum, avg,
    min, max, asc, desc, sql, like, ilike, exists, between, getTableColumns,
} from 'drizzle-orm'
export { relations } from 'drizzle-orm'
export type { SQL } from 'drizzle-orm'
export { JAWAF_HOUSE_SETTING_KEY, getJawafHouseWorkspaceId } from './jawaf-house'
export { moveJawafBot, type MoveJawafBotInput } from './jawaf-move'

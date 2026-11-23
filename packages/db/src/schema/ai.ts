// AI tables: conversations and messages of Kura (the chat page, apps/main/app/(main)/kura). Every row carries `userId`
// and every query filters by it.
import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { user } from './core'

export const aiConversations = pgTable(
    'ai_conversation',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
        title: text('title').notNull().default('New chat'),
        /**
         * Kura settings for this conversation: { systemPrompt, temperature, maxTokens, topP, topK, think }. Null = the
         * defaults in apps/main/lib/boli.ts (KURA_DEFAULTS).
         */
        settings: jsonb('settings'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [index('ai_conversation_user_updated_idx').on(t.userId, t.updatedAt)],
)

export const aiMessages = pgTable(
    'ai_message',
    {
        id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
        conversationId: text('conversation_id').notNull().references(() => aiConversations.id, { onDelete: 'cascade' }),
        userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
        role: text('role').$type<'user' | 'assistant'>().notNull(),
        /** User rows: the text the MODEL reads (a card answer names the tool and what to do). Assistant rows: the reply text. */
        content: text('content').notNull().default(''),
        /** User rows: what the bubble shows when it differs from `content` (a card answer reads as a person would say it). */
        display: text('display'),
        /** User rows: the per-turn context block sent after this message, replayed so the history prefix stays cached. */
        context: text('context'),
        /** Assistant rows: the view parts (text, tool lines, cards with their state, links, notices) - a refresh re-renders them. */
        parts: jsonb('parts'),
        /** Assistant rows: the provider-shaped assistant + tool messages, replayed byte for byte on the next turn. */
        modelMessages: jsonb('model_messages'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [
        index('ai_message_conversation_created_idx').on(t.conversationId, t.createdAt),
        index('ai_message_user_idx').on(t.userId),
    ],
)

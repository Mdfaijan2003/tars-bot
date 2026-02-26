import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    email: v.optional(v.string()),
    isOnline: v.boolean(),
    lastSeenAt: v.number()
  }).index("by_clerk_id", ["clerkId"]),

  conversations: defineTable({
    isGroup: v.boolean(),
    name: v.optional(v.string()),
    participantIds: v.array(v.id("users")),
    updatedAt: v.number(),
    lastMessagePreview: v.optional(v.string())
  }).index("by_participants", ["participantIds"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
    deletedAt: v.optional(v.number()),
    reactions: v.optional(
      v.array(
        v.object({
          userId: v.id("users"),
          emoji: v.string()
        })
      )
    )
  }).index("by_conversation", ["conversationId", "createdAt"]),

  readReceipts: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    lastReadAt: v.number()
  })
    .index("by_conversation_user", ["conversationId", "userId"])
    .index("by_user", ["userId"]),

  typing: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    updatedAt: v.number()
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_user", ["conversationId", "userId"])
});

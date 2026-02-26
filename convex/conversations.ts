import { mutation, query } from "convex/server";
import { v } from "convex/values";

async function getMe(ctx: any, clerkId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", clerkId))
    .first();
}

export const openDirectConversation = mutation({
  args: { clerkId: v.string(), otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await getMe(ctx, args.clerkId);
    if (!me) throw new Error("Unauthorized");

    const existing = (await ctx.db.query("conversations").collect()).find(
      (c: any) =>
        !c.isGroup &&
        c.participantIds.length === 2 &&
        c.participantIds.includes(me._id) &&
        c.participantIds.includes(args.otherUserId)
    );
    if (existing) return existing._id;

    return await ctx.db.insert("conversations", {
      isGroup: false,
      participantIds: [me._id, args.otherUserId],
      updatedAt: Date.now()
    });
  }
});

export const listForCurrentUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const me = await getMe(ctx, args.clerkId);
    if (!me) return [];

    const conversations = (await ctx.db.query("conversations").collect()).filter((c: any) =>
      c.participantIds.includes(me._id)
    );

    const enriched = await Promise.all(
      conversations.map(async (conversation: any) => {
        const others = await Promise.all(
          conversation.participantIds
            .filter((id: any) => id !== me._id)
            .map((id: any) => ctx.db.get(id))
        );

        const receipts = await ctx.db
          .query("readReceipts")
          .withIndex("by_conversation_user", (q: any) => q.eq("conversationId", conversation._id).eq("userId", me._id))
          .first();

        const unread = (await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q: any) => q.eq("conversationId", conversation._id))
          .collect()
        ).filter((m: any) => m.senderId !== me._id && m.createdAt > (receipts?.lastReadAt ?? 0)).length;

        return {
          ...conversation,
          title: conversation.isGroup
            ? conversation.name ?? "Unnamed Group"
            : others[0]?.name ?? "Unknown User",
          avatar: conversation.isGroup ? undefined : others[0]?.imageUrl,
          unread
        };
      })
    );

    return enriched.sort((a, b) => b.updatedAt - a.updatedAt);
  }
});

export const markAsRead = mutation({
  args: { clerkId: v.string(), conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const me = await getMe(ctx, args.clerkId);
    if (!me) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("readReceipts")
      .withIndex("by_conversation_user", (q) => q.eq("conversationId", args.conversationId).eq("userId", me._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { lastReadAt: Date.now() });
      return;
    }

    await ctx.db.insert("readReceipts", {
      conversationId: args.conversationId,
      userId: me._id,
      lastReadAt: Date.now()
    });
  }
});

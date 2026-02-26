import { mutation, query } from "convex/server";
import { v } from "convex/values";

async function getMe(ctx: any, clerkId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", clerkId))
    .first();
}

export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    return await Promise.all(
      messages.map(async (m) => ({ ...m, sender: await ctx.db.get(m.senderId) }))
    );
  }
});

export const send = mutation({
  args: { clerkId: v.string(), conversationId: v.id("conversations"), content: v.string() },
  handler: async (ctx, args) => {
    const me = await getMe(ctx, args.clerkId);
    if (!me) throw new Error("Unauthorized");
    const content = args.content.trim();
    if (!content) throw new Error("Message cannot be empty");

    const now = Date.now();
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: me._id,
      content,
      createdAt: now,
      reactions: []
    });

    await ctx.db.patch(args.conversationId, {
      updatedAt: now,
      lastMessagePreview: content.slice(0, 80)
    });
  }
});

export const softDelete = mutation({
  args: { clerkId: v.string(), messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const me = await getMe(ctx, args.clerkId);
    if (!me) throw new Error("Unauthorized");
    const message = await ctx.db.get(args.messageId);
    if (!message || message.senderId !== me._id) throw new Error("Not allowed");

    await ctx.db.patch(message._id, {
      content: "This message was deleted",
      deletedAt: Date.now()
    });
  }
});

const ALLOWED = ["👍", "❤️", "😂", "😮", "😢"];

export const toggleReaction = mutation({
  args: { clerkId: v.string(), messageId: v.id("messages"), emoji: v.string() },
  handler: async (ctx, args) => {
    if (!ALLOWED.includes(args.emoji)) throw new Error("Unsupported reaction");
    const me = await getMe(ctx, args.clerkId);
    if (!me) throw new Error("Unauthorized");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const reactions = message.reactions ?? [];
    const index = reactions.findIndex((r) => r.userId === me._id && r.emoji === args.emoji);

    if (index >= 0) {
      reactions.splice(index, 1);
    } else {
      reactions.push({ userId: me._id, emoji: args.emoji });
    }

    await ctx.db.patch(args.messageId, { reactions });
  }
});

import { mutation, query } from "convex/server";
import { v } from "convex/values";

async function getMe(ctx: any, clerkId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", clerkId))
    .first();
}

export const touch = mutation({
  args: { clerkId: v.string(), conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const me = await getMe(ctx, args.clerkId);
    if (!me) return;
    const row = await ctx.db
      .query("typing")
      .withIndex("by_conversation_user", (q) => q.eq("conversationId", args.conversationId).eq("userId", me._id))
      .first();

    if (row) {
      await ctx.db.patch(row._id, { updatedAt: Date.now() });
    } else {
      await ctx.db.insert("typing", {
        conversationId: args.conversationId,
        userId: me._id,
        updatedAt: Date.now()
      });
    }
  }
});

export const list = query({
  args: { conversationId: v.id("conversations"), clerkId: v.string() },
  handler: async (ctx, args) => {
    const me = await getMe(ctx, args.clerkId);
    if (!me) return [];
    const rows = await ctx.db
      .query("typing")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    const fresh = rows.filter((r) => Date.now() - r.updatedAt < 2000 && r.userId !== me._id);
    return await Promise.all(fresh.map((r) => ctx.db.get(r.userId)));
  }
});

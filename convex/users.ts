import { mutation, query } from "convex/server";
import { v } from "convex/values";

export const upsertFromClerk = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    email: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        imageUrl: args.imageUrl,
        email: args.email,
        isOnline: true,
        lastSeenAt: Date.now()
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      ...args,
      isOnline: true,
      lastSeenAt: Date.now()
    });
  }
});

export const setOnline = mutation({
  args: { clerkId: v.string(), isOnline: v.boolean() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return;
    await ctx.db.patch(user._id, { isOnline: args.isOnline, lastSeenAt: Date.now() });
  }
});

export const getCurrent = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  }
});

export const search = query({
  args: { clerkId: v.string(), q: v.string() },
  handler: async (ctx, args) => {
    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!me) return [];

    const users = await ctx.db.query("users").collect();
    const term = args.q.trim().toLowerCase();

    return users.filter((u) => u._id !== me._id && (!term || u.name.toLowerCase().includes(term)));
  }
});

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  spCall,
  spCallCached,
  spItemsUnion,
  spItemsUnionCount,
  type SpProduct,
  type SpStockItem,
} from "./socialplatforms.server";
import { assertSocialPlatformsAdmin } from "./socialplatforms-admin.server";

export type SpProductSummary = SpProduct;

export type SpBalance = { balance: number; currency: string };
export type SpProfile = { tier: string; discountRate: number; username: string; email: string };
export type SpCategory = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  imageUrl: string | null;
  productCount: number;
};
export type SpProductDetail = SpProduct & {
  description: string;
  filterConfig: Array<{ key: string; type: string; label: string }>;
  publicFields: Array<{ name: string; label: string; type: string }>;
};
export type SpItemsPage = {
  items: SpStockItem[];
  totalCount: number;
  pagination: { page: number; limit: number; totalPages: number };
};
export type SpJson = string | number | boolean | null | SpJson[] | { [k: string]: SpJson };

export type SpOrder = {
  id: string;
  batchId?: string;
  status: string;
  createdAt?: string;
  [k: string]: SpJson | undefined;
};

/** Catalog: products available from the supplier. Authenticated users only. */
export const spListProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const res = await spCall<{ products: SpProduct[] }>("products");
    return res.products;
  });

export const spListCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const res = await spCall<{ categories: SpCategory[] }>("categories");
    return res.categories;
  });

export const spProductDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { product: string }) => {
    if (!input?.product) throw new Error("product required");
    return { product: String(input.product).slice(0, 200) };
  })
  .handler(async ({ data }) =>
    spCall<SpProductDetail>("product.detail", { product: data.product }),
  );

export const spProductStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { product: string }) => {
    if (!input?.product) throw new Error("product required");
    return { product: String(input.product).slice(0, 200) };
  })
  .handler(async ({ data }) =>
    spCall<{ product: string; stock: number }>("product.stock", { product: data.product }),
  );

/** Step 2 of selective purchase: list individual accounts with public attributes. */
export const spProductCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      product: string;
      filters?: Record<string, unknown>;
      variants?: Array<Record<string, unknown>>;
    }) => {
    if (!input?.product) throw new Error("product required");
    return {
      product: String(input.product).slice(0, 200),
      filters: input.filters && typeof input.filters === "object" ? input.filters : undefined,
      variants: Array.isArray(input.variants) ? input.variants.slice(0, 8) : undefined,
    };
    },
  )
  .handler(async ({ data }) => {
    if (data.variants && data.variants.length > 0) {
      const { totalCount } = await spItemsUnionCount(data.product, data.variants);
      return { totalCount };
    }
    const res = await spCallCached<SpItemsPage>("product.items", {
      product: data.product,
      page: 1,
      limit: 1,
      ...(data.filters && Object.keys(data.filters).length > 0 ? { filters: data.filters } : {}),
    });
    return { totalCount: res.totalCount };
  });

/**
 * Batched availability counts: the filter panel needs ~25 numbers at once.
 * One round-trip, fanned out in parallel server-side on top of the cache.
 */
export const spProductCounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      product: string;
      queries: Array<{ id: string; variants: Array<Record<string, unknown>> }>;
    }) => {
      if (!input?.product) throw new Error("product required");
      const queries = (Array.isArray(input.queries) ? input.queries : [])
        .slice(0, 40)
        .map((q) => ({
          id: String(q.id).slice(0, 64),
          variants: (Array.isArray(q.variants) ? q.variants : []).slice(0, 8),
        }));
      return { product: String(input.product).slice(0, 200), queries };
    },
  )
  .handler(async ({ data }) => {
    const entries = await Promise.all(
      data.queries.map(async ({ id, variants }) => {
        try {
          const { totalCount } = await spItemsUnionCount(data.product, variants);
          return [id, totalCount] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    );
    return { counts: Object.fromEntries(entries) as Record<string, number | null> };
  });

export const spProductItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      product: string;
      page?: number;
      limit?: number;
      fresh?: boolean;
      filters?: Record<string, unknown>;
      variants?: Array<Record<string, unknown>>;
    }) => {
      if (!input?.product) throw new Error("product required");
      return {
        product: String(input.product).slice(0, 200),
        page: Math.max(1, Math.min(Number(input.page) || 1, 10000)),
        limit: Math.max(1, Math.min(Number(input.limit) || 20, 100)),
        fresh: input.fresh === true,
        filters: input.filters && typeof input.filters === "object" ? input.filters : undefined,
        variants: Array.isArray(input.variants) ? input.variants.slice(0, 8) : undefined,
      };
    },
  )
  .handler(async ({ data }) => {
    if (data.variants && data.variants.length > 0) {
      return spItemsUnion(data.product, data.variants, data.page, data.limit);
    }
    const payload = {
      product: data.product,
      page: data.page,
      limit: data.limit,
      ...(data.filters && Object.keys(data.filters).length > 0
        ? { filters: data.filters }
        : {}),
    };
    return data.fresh
      ? spCall<SpItemsPage>("product.items", payload)
      : spCallCached<SpItemsPage>("product.items", payload);
  });

/** Admin-only: reseller wallet + profile (tier, discount). */
export const spBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSocialPlatformsAdmin(context as never);
    return spCall<SpBalance>("balance");
  });

export const spProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSocialPlatformsAdmin(context as never);
    return spCall<SpProfile>("profile");
  });

export const spOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { page?: number; limit?: number } | undefined) => ({
    page: Math.max(1, Math.min(Number(input?.page) || 1, 10000)),
    limit: Math.max(1, Math.min(Number(input?.limit) || 20, 100)),
  }))
  .handler(async ({ data, context }) => {
    await assertSocialPlatformsAdmin(context as never);
    return spCall<{ orders: SpOrder[]; totalCount: number }>("orders", data);
  });

export const spOrderDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { order: string }) => {
    if (!input?.order) throw new Error("order required");
    return { order: String(input.order).slice(0, 200) };
  })
  .handler(async ({ data, context }) => {
    await assertSocialPlatformsAdmin(context as never);
    return spCall<SpOrder>("order.detail", { orderId: data.order, order: data.order });
  });

/**
 * Admin-only supplier purchase. Two modes, never mixed:
 *  - selective: items = ["STOCK_ITEM_ID", ...]
 *  - bulk: quantity = N
 */
export const spPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { product: string; items?: string[]; quantity?: number }) => {
    if (!input?.product) throw new Error("product required");
    const items = Array.isArray(input.items) ? input.items.filter(Boolean).slice(0, 50) : undefined;
    const quantity = input.quantity
      ? Math.max(1, Math.min(Number(input.quantity), 100))
      : undefined;
    if ((items?.length ? 1 : 0) + (quantity ? 1 : 0) !== 1) {
      throw new Error("Provide either items (selective) or quantity (bulk), not both");
    }
    return { product: String(input.product).slice(0, 200), items, quantity };
  })
  .handler(async ({ data, context }) => {
    await assertSocialPlatformsAdmin(context as never);
    return spCall<{ orders: Array<Record<string, SpJson>>; batchId?: string }>("product.purchase", {
      product: data.product,
      ...(data.items ? { items: data.items } : { quantity: data.quantity }),
    });
  });

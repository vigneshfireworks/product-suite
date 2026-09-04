import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Key helpers
export const keys = {
  user: (id: string) => `user:${id}`,
  userByEmail: (email: string) => `user:email:${email}`,
  userByPhone: (phone: string) => `user:phone:${phone}`,
  users: () => `users`,
  business: (id: string) => `business:${id}`,
  businesses: () => `businesses`,
  partner: (id: string) => `partner:${id}`,
  partners: () => `partners`,
  partnerByEmail: (email: string) => `partner:email:${email}`,
  product: (id: string) => `product:${id}`,
  productsByBusiness: (businessId: string) => `products:business:${businessId}`,
  order: (id: string) => `order:${id}`,
  ordersByUser: (userId: string) => `orders:user:${userId}`,
  ordersByBusiness: (businessId: string) => `orders:business:${businessId}`,
  cart: (userId: string) => `cart:${userId}`,
  watchlist: (userId: string) => `watchlist:${userId}`,
  expense: (id: string) => `expense:${id}`,
  expensesByBusiness: (businessId: string) => `expenses:business:${businessId}`,
  loan: (id: string) => `loan:${id}`,
  loansByUser: (userId: string) => `loans:user:${userId}`,
  loansByBusiness: (businessId: string) => `loans:business:${businessId}`,
  history: (entity: string, id: string) => `history:${entity}:${id}`,
  auditByBusiness: (businessId: string) => `audit:business:${businessId}`,
  category: (id: string) => `category:${id}`,
  categoriesByBusiness: (businessId: string) => `categories:business:${businessId}`,
  session: (token: string) => `session:${token}`,
  userBusinessAccess: (userId: string) => `user:business_access:${userId}`,
};

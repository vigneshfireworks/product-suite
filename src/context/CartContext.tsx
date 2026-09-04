"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CartItem, WatchlistItem } from "@/types";

interface CartContextType {
  cart: CartItem[];
  watchlist: WatchlistItem[];
  addToCart: (item: Omit<CartItem, "addedAt">) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, quantity: number) => void;
  clearBusinessCart: (businessId: string) => void;
  clearCart: () => void;
  addToWatchlist: (item: Omit<WatchlistItem, "addedAt">) => void;
  removeFromWatchlist: (productId: string) => void;
  cartCount: number;
  cartTotal: number;
  watchlistCount: number;
  getBusinessCart: (businessId: string) => CartItem[];
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    const storedCart = localStorage.getItem("viki_cart");
    const storedWatchlist = localStorage.getItem("viki_watchlist");
    if (storedCart) setCart(JSON.parse(storedCart));
    if (storedWatchlist) setWatchlist(JSON.parse(storedWatchlist));
  }, []);

  const saveCart = (items: CartItem[]) => {
    setCart(items);
    localStorage.setItem("viki_cart", JSON.stringify(items));
  };
  const saveWatchlist = (items: WatchlistItem[]) => {
    setWatchlist(items);
    localStorage.setItem("viki_watchlist", JSON.stringify(items));
  };

  const addToCart = (item: Omit<CartItem, "addedAt">) => {
    const existing = cart.find((c) => c.productId === item.productId);
    if (existing) {
      saveCart(cart.map((c) => c.productId === item.productId ? { ...c, quantity: c.quantity + item.quantity } : c));
    } else {
      saveCart([...cart, { ...item, addedAt: new Date().toISOString() }]);
    }
  };

  const removeFromCart = (productId: string) => {
    saveCart(cart.filter((c) => c.productId !== productId));
  };

  const updateCartQty = (productId: string, quantity: number) => {
    if (quantity <= 0) return removeFromCart(productId);
    saveCart(cart.map((c) => c.productId === productId ? { ...c, quantity } : c));
  };

  const clearBusinessCart = (businessId: string) => {
    saveCart(cart.filter((c) => c.businessId !== businessId));
  };

  // Clears the entire cart in one shot (use after checkout to avoid stale-closure bugs)
  const clearCart = () => saveCart([]);

  const addToWatchlist = (item: Omit<WatchlistItem, "addedAt">) => {
    const existing = watchlist.find((w) => w.productId === item.productId);
    if (!existing) {
      saveWatchlist([...watchlist, { ...item, addedAt: new Date().toISOString() }]);
    }
  };

  const removeFromWatchlist = (productId: string) => {
    saveWatchlist(watchlist.filter((w) => w.productId !== productId));
  };

  const getBusinessCart = (businessId: string) => cart.filter((c) => c.businessId === businessId);

  return (
    <CartContext.Provider value={{
      cart, watchlist,
      addToCart, removeFromCart, updateCartQty, clearBusinessCart, clearCart,
      addToWatchlist, removeFromWatchlist,
      cartCount: cart.reduce((sum, c) => sum + c.quantity, 0),
      cartTotal: cart.reduce((sum, c) => sum + c.price * c.quantity, 0),
      watchlistCount: watchlist.length,
      getBusinessCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);

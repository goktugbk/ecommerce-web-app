"use client";

import { create } from "zustand";

type CartDrawerState = {
  open: boolean;
};

type CartDrawerActions = {
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

export type CartDrawerStore = CartDrawerState & CartDrawerActions;

export const useCartDrawer = create<CartDrawerStore>((set, get) => ({
  open: false,
  openDrawer: () => set({ open: true }),
  closeDrawer: () => set({ open: false }),
  toggleDrawer: () => set({ open: !get().open }),
}));

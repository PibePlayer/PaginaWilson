"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

interface CategoryChange {
  categoryId: string;
  name: string;
}

interface FeaturedChange {
  meliId: string;
  featured: boolean;
}

interface AdminChanges {
  discountPercent?: number;
  categories: CategoryChange[];
  featured: FeaturedChange[];
  featuredOrder?: string[];
}

interface AdminChangesContextValue {
  changes: AdminChanges;
  hasChanges: boolean;
  changeCount: number;
  revision: number;

  setDiscountChange: (
    value: number | undefined
  ) => void;

  setCategoryChange: (
    categoryId: string,
    name: string,
    originalName: string
  ) => void;

  setFeaturedChange: (
    meliId: string,
    featured: boolean,
    originalFeatured: boolean
  ) => void;

  setFeaturedOrderChange: (
    order: string[],
    originalOrder: string[]
  ) => void;

  clearChanges: () => void;
}

const AdminChangesContext =
  createContext<AdminChangesContextValue | null>(
    null
  );

export function AdminChangesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [changes, setChanges] =
    useState<AdminChanges>({
      categories: [],
      featured: [],
    });

  const [revision, setRevision] =
    useState(0);

  function setDiscountChange(
    value: number | undefined
  ) {
    setChanges((current) => ({
      ...current,
      discountPercent: value,
    }));
  }

  function setCategoryChange(
    categoryId: string,
    name: string,
    originalName: string
  ) {
    setChanges((current) => {
      const categories =
        current.categories.filter(
          (item) =>
            item.categoryId !== categoryId
        );

      if (
        name.trim() !==
        originalName.trim()
      ) {
        categories.push({
          categoryId,
          name: name.trim(),
        });
      }

      return {
        ...current,
        categories,
      };
    });
  }

  function setFeaturedChange(
    meliId: string,
    featured: boolean,
    originalFeatured: boolean
  ) {
    setChanges((current) => {
      const featuredChanges =
        current.featured.filter(
          (item) =>
            item.meliId !== meliId
        );

      if (
        featured !== originalFeatured
      ) {
        featuredChanges.push({
          meliId,
          featured,
        });
      }

      return {
        ...current,
        featured:
          featuredChanges,
      };
    });
  }

  function setFeaturedOrderChange(
    order: string[],
    originalOrder: string[]
  ) {
    const same =
      order.length ===
        originalOrder.length &&
      order.every(
        (meliId, index) =>
          meliId ===
          originalOrder[index]
      );

    setChanges((current) => ({
      ...current,
      featuredOrder: same
        ? undefined
        : [...order],
    }));
  }

  function clearChanges() {
    setChanges({
      categories: [],
      featured: [],
    });

    setRevision(
      (current) => current + 1
    );
  }

  const value = useMemo(() => {
    const changeCount =
      (changes.discountPercent !==
      undefined
        ? 1
        : 0) +
      changes.categories.length +
      changes.featured.length +
      (changes.featuredOrder
        ? 1
        : 0);

    return {
      changes,
      hasChanges:
        changeCount > 0,
      changeCount,
      revision,

      setDiscountChange,
      setCategoryChange,
      setFeaturedChange,
      setFeaturedOrderChange,
      clearChanges,
    };
  }, [changes, revision]);

  return (
    <AdminChangesContext.Provider
      value={value}
    >
      {children}
    </AdminChangesContext.Provider>
  );
}

export function useAdminChanges() {
  const context =
    useContext(
      AdminChangesContext
    );

  if (!context) {
    throw new Error(
      "useAdminChanges debe utilizarse dentro de AdminChangesProvider."
    );
  }

  return context;
}
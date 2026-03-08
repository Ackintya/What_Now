import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PRODUCT_CATEGORIES } from "../constants";
import type { CreateLovedProductPayload, LovedProductPayload } from "./types";

interface LovedProductsSectionProps {
  products: LovedProductPayload[];
  onAdd: (product: CreateLovedProductPayload) => Promise<void>;
  onDelete: (productId: string) => Promise<void>;
  onUpdate: (productId: string, patch: Partial<CreateLovedProductPayload>) => Promise<void>;
  loading: boolean;
  userId: string;
  defaultOpen?: boolean;
}

interface DraftProduct {
  product_name: string;
  brand: string;
  category: string;
  notes: string;
}

const EMPTY_DRAFT: DraftProduct = {
  product_name: "",
  brand: "",
  category: "cleanser",
  notes: "",
};

export function LovedProductsSection({
  products,
  onAdd,
  onDelete,
  onUpdate,
  loading,
  userId,
  defaultOpen = false,
}: LovedProductsSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showProducts, setShowProducts] = useState(false);
  const [draft, setDraft] = useState<DraftProduct>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftProduct>(EMPTY_DRAFT);

  const sortedProducts = useMemo(() => [...products], [products]);

  const handleAdd = async () => {
    await onAdd({
      user_id: userId,
      product_name: draft.product_name.trim(),
      brand: draft.brand.trim(),
      category: draft.category.trim().toLowerCase(),
      notes: draft.notes.trim() || undefined,
    });

    setDraft(EMPTY_DRAFT);
  };

  const startEdit = (product: LovedProductPayload) => {
    setEditingId(product._id || null);
    setEditDraft({
      product_name: product.product_name,
      brand: product.brand,
      category: product.category,
      notes: product.notes || "",
    });
  };

  const handleUpdate = async (productId: string) => {
    await onUpdate(productId, {
      user_id: userId,
      product_name: editDraft.product_name.trim(),
      brand: editDraft.brand.trim(),
      category: editDraft.category.trim().toLowerCase(),
      notes: editDraft.notes.trim() || undefined,
    });

    setEditingId(null);
    setEditDraft(EMPTY_DRAFT);
  };

  return (
    <section id="products" className="module-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="module-title">Loved Products</h3>
          <p className="module-subtitle">Save products you tolerate well. Ingredients are looked up online automatically.</p>
        </div>

        <button type="button" className="btn-secondary" onClick={() => setIsOpen((prev) => !prev)}>
          <span>{isOpen ? "Hide" : "Open"}</span>
          <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {!isOpen ? null : (
        <>
          <div className="rounded-lg border border-doom-primary/20 bg-doom-bg/40 p-4 space-y-3 mb-5 mt-5">
            <p className="font-semibold text-doom-text">Add product</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="input-field"
                placeholder="Product name"
                value={draft.product_name}
                onChange={(event) => setDraft((prev) => ({ ...prev, product_name: event.target.value }))}
              />
              <input
                className="input-field"
                placeholder="Brand"
                value={draft.brand}
                onChange={(event) => setDraft((prev) => ({ ...prev, brand: event.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                className="input-field"
                value={draft.category}
                onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
              >
                {PRODUCT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <p className="text-xs text-doom-muted self-center">
                Ingredient list will be fetched online from product databases when you save.
              </p>
            </div>

            <textarea
              className="input-field"
              rows={2}
              placeholder="Notes (optional)"
              value={draft.notes}
              onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
            />

            <button
              type="button"
              className="btn-primary"
              disabled={loading || !draft.product_name || !draft.brand}
              onClick={handleAdd}
            >
              {loading ? "Saving..." : "Save loved product"}
            </button>
          </div>

          <div className="flex justify-start mb-4">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowProducts((prev) => !prev)}
            >
              {showProducts ? "Hide your loved products" : "See your loved products"}
            </button>
          </div>

          {!showProducts ? null : <div className="space-y-3">
            {sortedProducts.length === 0 ? (
              <p className="text-sm text-doom-muted">No loved products saved yet.</p>
            ) : (
              sortedProducts.map((product) => {
                const isEditing = editingId === product._id;
                return (
                  <div key={product._id} className="rounded-lg border border-doom-primary/20 bg-doom-bg/40 p-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            className="input-field"
                            value={editDraft.product_name}
                            onChange={(event) =>
                              setEditDraft((prev) => ({
                                ...prev,
                                product_name: event.target.value,
                              }))
                            }
                          />
                          <input
                            className="input-field"
                            value={editDraft.brand}
                            onChange={(event) => setEditDraft((prev) => ({ ...prev, brand: event.target.value }))}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <select
                            className="input-field"
                            value={editDraft.category}
                            onChange={(event) => setEditDraft((prev) => ({ ...prev, category: event.target.value }))}
                          >
                            {PRODUCT_CATEGORIES.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-doom-muted self-center">
                            Ingredients will be refreshed from online lookup when saved.
                          </p>
                        </div>
                        <textarea
                          className="input-field"
                          rows={2}
                          value={editDraft.notes}
                          onChange={(event) => setEditDraft((prev) => ({ ...prev, notes: event.target.value }))}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => product._id && handleUpdate(product._id)}
                          >
                            Save
                          </button>
                          <button type="button" className="btn-secondary" onClick={() => setEditingId(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-doom-text">{product.product_name}</p>
                            <p className="text-sm text-doom-muted">
                              {product.brand} - {product.category}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" className="btn-secondary" onClick={() => startEdit(product)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => product._id && onDelete(product._id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                          {product.ingredients.map((ingredient) => (
                            <span key={ingredient} className="chip">
                              {ingredient}
                            </span>
                          ))}
                        </div>

                        {product.ingredient_lookup_source ? (
                          <p className="text-xs text-doom-muted mt-2">
                            Source: {product.ingredient_lookup_source}
                            {product.ingredient_lookup_match ? ` (${product.ingredient_lookup_match})` : ""}
                          </p>
                        ) : null}

                        {product.notes ? <p className="text-xs text-doom-muted mt-3">{product.notes}</p> : null}
                        {product.ingredient_lookup_grounding_line ? (
                          <p className="text-xs text-doom-muted mt-2">{product.ingredient_lookup_grounding_line}</p>
                        ) : null}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>}
        </>
      )}
    </section>
  );
}

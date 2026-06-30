import { requireRole } from "@/lib/auth/session";
import { LEDGER_WRITERS } from "@/lib/auth/api";
import { listProducts } from "@/lib/products/products";
import { ProductsManager } from "@/components/invest/ProductsManager";

export default async function ProductsPage() {
  await requireRole(LEDGER_WRITERS);
  const products = await listProducts();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Products</h1>
      <p className="mb-8 text-sm text-ink-soft">
        Define the investment products clients can allocate cash to.
      </p>
      <ProductsManager
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status,
          expectedReturnBps: p.expectedReturnBps,
        }))}
      />
    </main>
  );
}

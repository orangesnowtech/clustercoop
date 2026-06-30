import { requireRole } from "@/lib/auth/session";
import { getClientLedger } from "@/lib/ledger/statements";
import { getClientKyc } from "@/lib/kyc/queries";
import { getClientHoldings } from "@/lib/investments/holdings";
import { listProducts } from "@/lib/products/products";
import { KycGate } from "@/components/kyc/KycGate";
import { InvestPanel } from "@/components/invest/InvestPanel";

export default async function InvestPage() {
  const user = await requireRole(["customer"]);
  const [{ balanceKobo }, kyc, holdings, products] = await Promise.all([
    getClientLedger(user.uid),
    getClientKyc(user.uid),
    getClientHoldings(user.uid),
    listProducts({ activeOnly: true }),
  ]);

  const nameById = new Map(products.map((p) => [p.id, p.name]));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Invest</h1>
      <p className="mb-8 text-sm text-ink-soft">
        Put your cash to work across our investment products.
      </p>

      <KycGate status={kyc.kycStatus} />

      <InvestPanel
        cashKobo={balanceKobo}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
        }))}
        holdings={holdings.map((h) => ({
          productId: h.productId,
          productName: nameById.get(h.productId) ?? h.productId,
          currentValueKobo: h.currentValueKobo,
          costBasisKobo: h.costBasisKobo,
        }))}
      />
    </main>
  );
}

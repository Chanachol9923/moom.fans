import "server-only";
import { publicStatus, slipDeadline } from "@/lib/domain/transactions";
import type { TransactionRow } from "@/lib/supabase/database.types";

/** The only transaction fields a supporter's browser ever sees. */
export type PayView = {
  status: TransactionRow["status"];
  kind: TransactionRow["kind"];
  amount: number;
  supporterName: string;
  productTitle: string | null;
  expiresAt: string;
  slipDeadline: string;
  canDownload: boolean;
};

export function payView(tx: TransactionRow): PayView {
  const status = publicStatus(tx);
  return {
    status,
    kind: tx.kind,
    amount: Number(tx.amount),
    supporterName: tx.supporter_name,
    productTitle: tx.product_title,
    expiresAt: tx.expires_at,
    slipDeadline: new Date(slipDeadline(tx)).toISOString(),
    canDownload: tx.kind === "purchase" && status === "verified" && Boolean(tx.product_id),
  };
}

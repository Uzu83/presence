import {
  mintWalletId,
  readWallet,
  type WalletCookie,
  writeWalletCookie,
} from "@/lib/credits/wallet";

/** Cookie が無ければ発行して書き込む */
export async function ensureWallet(): Promise<WalletCookie> {
  const existing = await readWallet();
  if (existing) return existing;
  const fresh: WalletCookie = { wid: mintWalletId() };
  await writeWalletCookie(fresh);
  return fresh;
}

import { CHAIN_ID } from "@/lib/money";

const NO_TEMPO = "Your wallet doesn't support the Tempo network. Use MetaMask, Rabby or OKX, or sign in with Google, email or X.";

async function ensureTempo(provider: any) {
  const hex = "0x" + CHAIN_ID.toString(16);
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
    return;
  } catch (e: any) {
    if (e?.code === 4001) throw e; // the person rejected it
  }
  try {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: hex,
        chainName: "Tempo",
        nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 },
        rpcUrls: ["https://rpc.tempo.xyz"],
        blockExplorerUrls: ["https://explore.mainnet.tempo.xyz"],
      }],
    });
  } catch (e: any) {
    if (e?.code === 4001) throw e;
    throw new Error(NO_TEMPO);
  }
}

// A normal EVM token transfer from an external wallet. On Tempo, a TIP-20 transfer pays its network fee in the token being sent.
export async function sendExternalTransfer(provider: any, from: string, token: string, data: string): Promise<string> {
  await ensureTempo(provider);
  const h = await provider.request({ method: "eth_sendTransaction", params: [{ from, to: token, data, value: "0x0" }] });
  if (!h) throw new Error("No transaction hash returned");
  return String(h);
}

// Fallback for wallet in-app browsers (Rabby, Trust, ...) when Privy does not list the wallet
export async function injectedProvider(expect: string | null): Promise<{ provider: any; address: string } | null> {
  const eth = typeof window !== "undefined" ? (window as any).ethereum : null;
  if (!eth) return null;
  const accts: string[] = await eth.request({ method: "eth_requestAccounts" });
  const address = accts && accts[0];
  if (!address) return null;
  if (expect && address.toLowerCase() !== expect.toLowerCase()) throw new Error("Wallet mismatch");
  return { provider: eth, address };
}

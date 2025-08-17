import { createWalletClient, Hex, http } from "viem";

const BASE_SEPOLIA_RPC_URL = "https://sepolia-preconf.base.org";

const privateKey = process.env.CANARY_WALLET_PRIVATE_KEY;

export class FlashFacilitator {
  private readonly client = createWalletClient({
    chain: {
      id: 84532,
      name: "base-sepolia",
      network: "base-sepolia",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: { http: [BASE_SEPOLIA_RPC_URL] },
        public: { http: [BASE_SEPOLIA_RPC_URL] },
      },
    },
    transport: http(BASE_SEPOLIA_RPC_URL),
    account: privateKey as Hex,
  });
  async submitSignedTx(signedTx: Hex): Promise<Hex> {
    // viem expects the raw tx as a hex string
    return await this.client.sendRawTransaction({ serializedTransaction: signedTx });
  }
}
import { Request, response, Response, Router } from "express";

import { RouterModule } from "../server/router_module";
import { FlashFacilitator } from "../facilitator/flash_facilitator";
import { keccak256 } from "viem";

export class HelloModule extends RouterModule {
  setupRoutes(router: Router): void {
    router.get("/exact", this.helloExact);
    router.get("/flash", this.helloFlash);
  }

  /** Basic handler. */
  private readonly helloExact = (req: Request, res: Response) => {
    console.log("Hello exact route hit");
    res.json({ message: "Hello, world!" });
  };

  private readonly helloFlash = (req: Request, res: Response) => {
    try {
      const paymentHeader = req.header("X-Payment");
      if (!paymentHeader) {
        res.status(402).json({ error: "Missing X-Payment header" });
        return;
      }
      // Decode base64
      const decoded = Buffer.from(paymentHeader, "base64").toString("utf-8");
      console.log(`Decoded X-Payment: ${decoded}`);
      let paymentObj;
      try {
        paymentObj = JSON.parse(decoded);
      } catch (e) {
        res.status(400).json({ error: "Invalid X-Payment JSON" });
        return;
      }
      if (paymentObj.scheme !== "flash") {
        res.status(400).json({ error: "Unsupported x402 payment scheme" });
      } else if (!paymentObj.payload) {
        res.status(400).json({ error: "Missing payload in X-Payment" });
        return;
      }
      const precalculatedTxHash = keccak256(paymentObj.payload);
      const facilitator = new FlashFacilitator();
      facilitator.submitSignedTx(paymentObj.payload)
        .then((txHash) => {
          console.log(`Submitted signed transaction: ${txHash}`);
          console.log(`Pre-calculated tx hash matches?: ${txHash === precalculatedTxHash}`);
        })
        .catch((err) => {
          console.log(`Transaction failed to submit: ${(err as Error).message}`);
          res.status(500).json({ error: (err as Error).message });
        });

      const paymentResponse = { success: true, transaction: precalculatedTxHash, network: "base-sepolia" };
      res.setHeader("X-Payment-Response", Buffer.from(JSON.stringify(paymentResponse)).toString("base64"));
      res.json({ message: "Hello, world! With flash!" });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };
}
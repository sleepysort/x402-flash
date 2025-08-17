import express, { Express } from 'express';
import { inject, injectable } from 'inversify';
// import { paymentMiddleware } from 'x402-express';
import { multiSchemePaymentMiddleware } from '../middleware';

import { SERVER_WALLET_ADDRESS } from "../constants";

import { RouterModule } from './router_module';

/** Represents a server instance. */
@injectable()
export class Server {
  constructor(@inject("express") private app: Express) { }

  /** Installs a router module at the specified base path. */
  public install(basePath: string, routerModule: RouterModule) {
    const router = express.Router();
    routerModule.setupRoutes(router);
    this.app.use(basePath, router);
  }

  /** Sets up x402 exact payment middleware. */
  public setupPaymentMiddleware() {
    this.app.use(multiSchemePaymentMiddleware(
      SERVER_WALLET_ADDRESS,
      {
        "GET /hello": {
          price: "$0.001",
          network: "base-sepolia",
          config: {
            description: "Basic hello world endpoint",
            // inputSchema: {},
            outputSchema: {
              type: "string",
            }
          }
        },
      },
      {
        url: "https://x402.org/facilitator",
      }
    ));
  }

  /** Starts the server at the specified port. */
  public start(port: number) {
    this.app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  }
}
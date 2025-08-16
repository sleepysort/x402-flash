import express, { Express } from 'express';

import { RouterModule } from './router_module';

/** Represents a server instance. */
export class Server {
  constructor(private app: Express) { }

  /** Installs a router module at the specified base path. */
  public install(basePath: string, routerModule: RouterModule) {
    const router = express.Router();
    routerModule.setupRoutes(router);
    this.app.use(basePath, router);
  }

  /** Starts the server at the specified port. */
  public start(port: number) {
    this.app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  }
}
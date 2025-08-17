import { Request, response, Response, Router } from "express";

import { RouterModule } from "../server/router_module";

export class HelloModule extends RouterModule {
  setupRoutes(router: Router): void {
    router.get("/", this.hello);
  }

  /** Basic handler. */
  private readonly hello = (req: Request, res: Response) => {
    res.json({ message: "Hello, world!" });
  };
}
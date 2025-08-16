import { Request, Response, Router } from "express";

import { RouterModule } from "../server/router_module";

export class HelloModule extends RouterModule {
  setupRoutes(router: Router): void {
    router.get("/exact", this.helloExact);
  }


  /** Basic handler. */
  private readonly helloExact = (req: Request, res: Response) => {
    console.log("Hello exact route hit");
    res.send("Hello, world!");
  }
}
import { Request, Response, Router } from "express";

import { RouterModule } from "../server/router_module";

export class RandomModule extends RouterModule {
  setupRoutes(router: Router): void {
    router.get("/", this.randomNumber);
  }

  /**
   * Endpoint that generates a random number [0, 200) and sleeps for that
   * number of milliseconds before responding.
   */
  private readonly randomNumber = (req: Request, res: Response) => {
    const value = Math.floor(Math.random() * 200);
    setTimeout(() => {
      res.json({ value });
    }, value)
  };
}
import express, { Router } from 'express';

/** DI friendly wrapper of an express router. */
export abstract class RouterModule {
  /** Sets up routes for the module on the specified router. */
  abstract setupRoutes(router: Router): void;
}
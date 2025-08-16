import express from 'express';

import { HelloModule } from './hello';
import { Server } from './server';

const server = new Server(express());

server.install("/hello", new HelloModule());

server.start(3000);

/** Initializes root level DI container bindings. */
function setupRootBindings() {
  // Nothing yet.
}
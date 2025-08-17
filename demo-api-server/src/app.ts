import express from 'express';

import { Container } from 'inversify';
import { HelloModule } from './hello';
import { Server } from './server';

const container = initializeContainer();
const server = container.get(Server);

server.setupPaymentMiddleware();
server.install("/hello", new HelloModule());

server.start(3002);

/** Initializes root level DI container bindings. */
function initializeContainer(): Container {
  const container = new Container();
  container.bind(Server).toConstantValue(new Server(express()));
  return container;
}
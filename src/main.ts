import 'dotenv/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';

// Application
import { AppModule } from './app.module.js';
import { RedisIoAdapter } from './adapters/redis-io.adapter.js';

// Session
import session from 'express-session';
import MongoStore from 'connect-mongo';
import type { NextFunction, Request, Response } from 'express';

// Sentry
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { SentryFilter } from './sentry.filter.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { resolveSessionMaxAgeMs } from './auth/session-policy.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });
  const config = app.get<ConfigService>(ConfigService);

  const isSentryEnabled =
    config.get('sentry') || typeof process.env.SENTRY_DNS !== 'undefined';
  if (isSentryEnabled) {
    Sentry.init({
      dsn: process.env.SENTRY_DNS,
      integrations: [
        // enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        new ProfilingIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: 1.0,
      // Set sampling rate for profiling - this is relative to tracesSampleRate
      profilesSampleRate: 1.0,
    });
    const { httpAdapter } = app.get(HttpAdapterHost);
    app.useGlobalFilters(new SentryFilter(httpAdapter));
  }
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Liquid Auth API')
    .setDescription('Authentication API')
    .setVersion('1.0')
    .addCookieAuth('connect.sid')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);
  const username = config.get('database.username');
  const host = config.get('database.host');
  const password = config.get('database.password');
  const name = config.get('database.name');
  const isAtlas = config.get('database.atlas');
  const uri = `mongodb${
    isAtlas ? '+srv' : ''
  }://${username}:${password}@${host}/${name}?authSource=admin&retryWrites=true&w=majority`;

  const store = MongoStore.create({
    mongoUrl: uri,
    ttl: Math.max(1, Math.ceil((config.get<number>('session.maxAgeMs') || 10 * 60 * 1000) / 1000)),
  });

  const sessionHandler = session({
    secret: config.get('session.secret'),
    // TODO: optimize session
    saveUninitialized: true,
    resave: true,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: config.get('session.secure'),
      sameSite: 'lax',
      maxAge: config.get<number>('session.maxAgeMs') || 10 * 60 * 1000,
    },
    store,
  });
  app.use(sessionHandler);
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.session?.cookie) {
      const standardMaxAgeMs =
        config.get<number>('session.maxAgeMs') || 10 * 60 * 1000;
      const mobileLongMaxAgeMs =
        config.get<number>('session.mobileLongMaxAgeMs') ||
        180 * 24 * 60 * 60 * 1000;
      req.session.cookie.maxAge = resolveSessionMaxAgeMs(
        req,
        standardMaxAgeMs,
        mobileLongMaxAgeMs,
      );
    }
    next();
  });
  const redisIoAdapter = new RedisIoAdapter(app, sessionHandler);
  await redisIoAdapter.connectToRedis(config);

  app.useWebSocketAdapter(redisIoAdapter);

  await app.listen(process.env.PORT || 3000);
}

await bootstrap();

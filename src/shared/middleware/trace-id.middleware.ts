// src/shared/middleware/trace-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TraceIdService } from '../services/trace-id.service';

@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  constructor(private readonly traceIdService: TraceIdService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const traceId = this.traceIdService.getOrGenerate(request.headers);
    request['traceId'] = traceId;
    next();
  }
}

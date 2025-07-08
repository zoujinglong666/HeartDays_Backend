import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  code: number;
  message: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  private readonly logger = new Logger(TransformInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    this.logger.log(`Processing ${request.method} ${request.url}`);
    
    return next.handle().pipe(
      map(data => {
        this.logger.log(`Response data: ${JSON.stringify(data)}`);
        
        return {
          data: data || null,
          code: 200,
          message: 'ok',
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}

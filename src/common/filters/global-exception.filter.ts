import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let res: any;
    if (exception instanceof BusinessException) {
      // 自定义业务异常，结构化信息
      res = {
        code: exception.code,
        message: exception.message,
      };
    } else if (exception instanceof HttpException) {
      res = exception.getResponse();
    } else {
      res = '内部服务器错误';
    }

    this.logger.error(
      `HTTP ${status} - ${request.method} ${request.url} - ${JSON.stringify(res)}`,
      exception instanceof Error ? exception.stack : '',
    );

    // 处理 message 字段，确保为字符串
    let message: string;
    if (typeof res === 'string') {
      message = res;
    } else if (typeof res === 'object' && res !== null) {
      // 兼容 class-validator 报错时 message 为数组
      if ('message' in res) {
        const msg = (res as any).message;
        if (Array.isArray(msg)) {
          message = msg[0];
        } else {
          message = msg;
        }
      } else if ('error' in res) {
        message = (res as any).error;
      } else {
        message = JSON.stringify(res);
      }
    } else {
      message = '内部服务器错误';
    }

    // 统一响应格式: { code, message, data }
    const code = exception instanceof BusinessException ? exception.code : status;
    response.status(status).json({
      code,
      message,
      data: null
    });
  }
}
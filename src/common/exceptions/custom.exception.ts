import { HttpException, HttpStatus } from '@nestjs/common';

export class CustomException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(
      {
        message,
        statusCode: status,
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }
}

export class UserNotFoundException extends CustomException {
  constructor(userId: string) {
    super(`用户 ${userId} 不存在`, HttpStatus.NOT_FOUND);
  }
}

export class EmailAlreadyExistsException extends CustomException {
  constructor(email: string) {
    super(`邮箱 ${email} 已存在`, HttpStatus.CONFLICT);
  }
}

export class UserAccountAlreadyExistsException extends CustomException {
  constructor(userAccount: string) {
    super(`账号 ${userAccount} 已存在`, HttpStatus.CONFLICT);
  }
}

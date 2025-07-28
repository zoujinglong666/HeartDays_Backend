export class BusinessException extends Error {
  public readonly code: number;
  public readonly detail: string;

  constructor(resultCode: ErrorCode, overrideMessage?: string) {
    super(overrideMessage ?? resultCode.message);
    this.code = resultCode.code;
  }
}

export class ErrorCode {
  constructor(
    public readonly code: number,
    public readonly message: string,
  ) {}

  // ✅ 通用状态
  static readonly SUCCESS = new ErrorCode(200, 'ok');
  static readonly PARAMS_ERROR = new ErrorCode(400, '请求参数错误');
  static readonly NULL_ERROR = new ErrorCode(404, '请求数据为空');
  static readonly DATA_VALIDATION_FAILED = new ErrorCode(4001, '数据验证失败');
  static readonly OPERATION_FAILED = new ErrorCode(5001, '操作失败');

  // ✅ 用户相关
  static readonly USER_EXIST = new ErrorCode(2001, '用户已存在');
  static readonly USER_NOT_FOUND = new ErrorCode(2002, '用户不存在');
  static readonly USER_STATUS_ERROR = new ErrorCode(2003, '用户状态异常');
  static readonly USER_PASSWORD_ERROR = new ErrorCode(2004, '密码错误');

  // ✅ 资源相关
  static readonly RESOURCE_NOT_FOUND = new ErrorCode(4041, '资源不存在');
  static readonly RESOURCE_CONFLICT = new ErrorCode(4091, '资源已存在或冲突');
  static readonly RESOURCE_LIMIT_EXCEEDED = new ErrorCode(4131, '资源大小超出限制');
  static readonly RESOURCE_PERMISSION_DENIED = new ErrorCode(4031, '资源权限不足');

  // ✅ 鉴权相关
  static readonly NOT_LOGIN = new ErrorCode(401, '未登录');
  static readonly TOKEN_EXPIRED = new ErrorCode(401, 'token已过期');
  static readonly NO_AUTH = new ErrorCode(403, '无权限');

  // ✅ 系统错误
  static readonly SYSTEM_ERROR = new ErrorCode(500, '系统内部异常');

  // ✅ 文件上传
  static readonly FILE_UPLOAD_ERROR = new ErrorCode(
    410,
    '文件上传失败',
  );
  static readonly FILE_TYPE_ERROR = new ErrorCode(
    415,
    '不支持的文件类型',
  );

  // ✅ 数据库操作
  static readonly DB_QUERY_ERROR = new ErrorCode(
    520,
    '数据库查询失败',
  );
  static readonly DB_INSERT_ERROR = new ErrorCode(521, '数据插入失败');
  static readonly DB_UPDATE_ERROR = new ErrorCode(522, '数据更新失败');

  // ✅ 请求限制与依赖服务
  static readonly TOO_MANY_REQUESTS = new ErrorCode(
    429,
    '请求过于频繁',
  );
  static readonly DEPENDENT_SERVICE_ERROR = new ErrorCode(
    503,
    '依赖服务调用失败',
  );
}

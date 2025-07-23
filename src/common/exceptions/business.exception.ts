export class BusinessException extends Error {
  public readonly code: number;
  public readonly detail: string;

  constructor(resultCode: CommonResultCode, overrideMessage?: string) {
    super(overrideMessage ?? resultCode.message);
    this.code = resultCode.code;
  }
}

export class CommonResultCode {
  constructor(
    public readonly code: number,
    public readonly message: string,
  ) {}

  // ✅ 通用状态
  static readonly SUCCESS = new CommonResultCode(200, 'ok');
  static readonly PARAMS_ERROR = new CommonResultCode(400, '请求参数错误');
  static readonly NULL_ERROR = new CommonResultCode(404, '请求数据为空');

  // ✅ 鉴权相关
  static readonly NOT_LOGIN = new CommonResultCode(401, '未登录');
  static readonly NO_AUTH = new CommonResultCode(403, '无权限');

  // ✅ 系统错误
  static readonly SYSTEM_ERROR = new CommonResultCode(500, '系统内部异常');

  // ✅ 文件上传
  static readonly FILE_UPLOAD_ERROR = new CommonResultCode(
    410,
    '文件上传失败',
  );
  static readonly FILE_TYPE_ERROR = new CommonResultCode(
    415,
    '不支持的文件类型',
  );

  // ✅ 数据库操作
  static readonly DB_QUERY_ERROR = new CommonResultCode(
    520,
    '数据库查询失败',
  );
  static readonly DB_INSERT_ERROR = new CommonResultCode(521, '数据插入失败');
  static readonly DB_UPDATE_ERROR = new CommonResultCode(522, '数据更新失败');

  // ✅ 请求限制与依赖服务
  static readonly TOO_MANY_REQUESTS = new CommonResultCode(
    429,
    '请求过于频繁',
  );
  static readonly DEPENDENT_SERVICE_ERROR = new CommonResultCode(
    503,
    '依赖服务调用失败',
  );
}

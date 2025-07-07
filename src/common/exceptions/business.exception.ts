export class BusinessException extends Error {
  public readonly code: number;
  public readonly detail: string;

  constructor(resultCode: CommonResultCode, overrideMessage?: string) {
    super(overrideMessage ?? resultCode.message);
    this.code = resultCode.code;
    this.detail = resultCode.detail;
  }
}

export class CommonResultCode {
  constructor(
    public readonly code: number,
    public readonly message: string,
    public readonly detail: string = '',
  ) {}

  // ✅ 通用状态
  static readonly SUCCESS = new CommonResultCode(20000, 'ok');
  static readonly PARAMS_ERROR = new CommonResultCode(40000, '请求参数错误');
  static readonly NULL_ERROR = new CommonResultCode(40001, '请求数据为空');

  // ✅ 鉴权相关
  static readonly NOT_LOGIN = new CommonResultCode(40100, '未登录');
  static readonly NO_AUTH = new CommonResultCode(40101, '无权限');

  // ✅ 系统错误
  static readonly SYSTEM_ERROR = new CommonResultCode(50000, '系统内部异常');

  // ✅ 文件上传
  static readonly FILE_UPLOAD_ERROR = new CommonResultCode(
    41000,
    '文件上传失败',
  );
  static readonly FILE_TYPE_ERROR = new CommonResultCode(
    41001,
    '不支持的文件类型',
  );

  // ✅ 数据库操作
  static readonly DB_QUERY_ERROR = new CommonResultCode(
    42000,
    '数据库查询失败',
  );
  static readonly DB_INSERT_ERROR = new CommonResultCode(42001, '数据插入失败');
  static readonly DB_UPDATE_ERROR = new CommonResultCode(42002, '数据更新失败');

  // ✅ 请求限制与依赖服务
  static readonly TOO_MANY_REQUESTS = new CommonResultCode(
    42900,
    '请求过于频繁',
  );
  static readonly DEPENDENT_SERVICE_ERROR = new CommonResultCode(
    43000,
    '依赖服务调用失败',
  );
}

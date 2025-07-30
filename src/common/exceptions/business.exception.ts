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
  static readonly PARAMS_ERROR = new ErrorCode(40000, '请求参数错误');
  static readonly NULL_ERROR = new ErrorCode(40400, '请求数据为空');


  /// Token过期
  static readonly TOKEN_EXPIRED = new ErrorCode(40100, 'Token已过期');



  /// Token无效
  static readonly TOKEN_INVALID = new ErrorCode(40102, 'Token无效');

  /// Token缺失
  static readonly TOKEN_MISSING = new ErrorCode(40103, '缺少Token');

  /// 刷新Token无效
  static readonly REFRESH_TOKEN_INVALID = new ErrorCode(40104, '刷新Token无效');
  static readonly NO_REFRESH_TOKEN = new ErrorCode(40105, '刷新Token不存在');


  // ✅ 鉴权相关
  static readonly NOT_LOGIN = new ErrorCode(40100, '未登录');
  static readonly NO_AUTH = new ErrorCode(40300, '无权限');

  // ✅ 系统错误
  static readonly SYSTEM_ERROR = new ErrorCode(50000, '系统内部异常');


  static readonly DATA_EXIST = new ErrorCode(40900, '数据已存在');

  static readonly NOT_FOUND = new ErrorCode(40400, '数据不存在');
  // ✅ 数据库操作
  static readonly DB_QUERY_ERROR = new ErrorCode(
    52000,
    '数据库查询失败',
  );
  static readonly DB_INSERT_ERROR = new ErrorCode(52100, '数据插入失败');
  static readonly DB_UPDATE_ERROR = new ErrorCode(52200, '数据更新失败');

  // ✅ 请求限制与依赖服务
  static readonly TOO_MANY_REQUESTS = new ErrorCode(
    42900,
    '请求过于频繁',
  );
  static readonly DEPENDENT_SERVICE_ERROR = new ErrorCode(
    50300,
    '依赖服务调用失败',
  );
}

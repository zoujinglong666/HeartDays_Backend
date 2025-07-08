export class EnumHelper<T extends Record<string, string | number>> {
  private enumObj: T;
  constructor(enumObj: T) {
    this.enumObj = enumObj;
  }

  /**
   * 根据 key 获取 value
   * @param key 枚举键名
   * @returns 枚举值
   */
  getValueByKey(key: string): T[keyof T] | undefined {
    return this.enumObj[key as keyof T];
  }

  /**
   * 根据 value 获取 key
   * @param value 枚举值
   * @returns 枚举键名
   */
  getKeyByValue(value: T[keyof T]): keyof T | undefined {
    const keys = Object.keys(this.enumObj) as Array<keyof T>;
    return keys.find((key) => this.enumObj[key] === value);
  }

  /**
   * 获取枚举的所有键值对
   * @returns 键值对数组
   */
  getEntries(): Array<[keyof T, T[keyof T]]> {
    return Object.entries(this.enumObj) as Array<[keyof T, T[keyof T]]>;
  }

  /**
   * 获取枚举的所有键
   * @returns 键数组
   */
  getKeys(): Array<keyof T> {
    return Object.keys(this.enumObj) as Array<keyof T>;
  }

  /**
   * 获取枚举的所有值
   * @returns 值数组
   */
  getValues(): Array<T[keyof T]> {
    return Object.values(this.enumObj) as Array<T[keyof T]>;
  }

  /**
   * 检查值是否有效
   * @param value 要检查的值
   * @returns 是否有效
   */
  isValidValue(value: any): value is T[keyof T] {
    return this.getValues().includes(value);
  }

  /**
   * 检查键是否有效
   * @param key 要检查的键
   * @returns 是否有效
   */
  isValidKey(key: string) {
    return key in this.enumObj;
  }

  /**
   * 获取枚举的键值对映射
   * @returns 键值对映射对象
   */
  getMap(): Record<string, T[keyof T]> {
    return this.enumObj as unknown as Record<string, T[keyof T]>;
  }
}

// 静态工具方法（保持向后兼容）
export class EnumUtils {
  /**
   * 根据 key 获取 value
   * @param enumObj 枚举对象
   * @param key 枚举键名
   * @returns 枚举值
   */
  static getValueByKey<T extends Record<string, string | number>>(
    enumObj: T,
    key: string,
  ): T[keyof T] | undefined {
    return enumObj[key as keyof T];
  }

  /**
   * 根据 value 获取 key
   * @param enumObj 枚举对象
   * @param value 枚举值
   * @returns 枚举键名
   */
  static getKeyByValue<T extends Record<string, string | number>>(
    enumObj: T,
    value: T[keyof T],
  ): keyof T | undefined {
    const keys = Object.keys(enumObj) as Array<keyof T>;
    return keys.find((key) => enumObj[key] === value);
  }

  /**
   * 获取枚举的所有键值对
   * @param enumObj 枚举对象
   * @returns 键值对数组
   */
  static getEntries<T extends Record<string, string | number>>(
    enumObj: T,
  ): Array<[keyof T, T[keyof T]]> {
    return Object.entries(enumObj) as Array<[keyof T, T[keyof T]]>;
  }

  /**
   * 获取枚举的所有键
   * @param enumObj 枚举对象
   * @returns 键数组
   */
  static getKeys<T extends Record<string, string | number>>(
    enumObj: T,
  ): Array<keyof T> {
    return Object.keys(enumObj) as Array<keyof T>;
  }

  /**
   * 获取枚举的所有值
   * @param enumObj 枚举对象
   * @returns 值数组
   */
  static getValues<T extends Record<string, string | number>>(
    enumObj: T,
  ): Array<T[keyof T]> {
    return Object.values(enumObj) as Array<T[keyof T]>;
  }

  /**
   * 检查值是否有效
   * @param enumObj 枚举对象
   * @param value 要检查的值
   * @returns 是否有效
   */
  static isValidValue<T extends Record<string, string | number>>(
    enumObj: T,
    value: any,
  ): value is T[keyof T] {
    return Object.values(enumObj).includes(value);
  }

  // @ts-ignore
  /**
   * 检查键是否有效
   * @param enumObj 枚举对象
   * @param key 要检查的键
   * @returns 是否有效
   */
  static isValidKey<T extends Record<string, string | number>>(
    enumObj: T,
    key: string,
  ) {
    return key in enumObj;
  }
}

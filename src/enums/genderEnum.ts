import { EnumHelper } from '../utils/enumHelper';

export enum Gender {
  Secret = 0,    // 保密
  Male = 1,      // 男
  Female = 2,    // 女
}

// 性别枚举工具类
export class GenderHelper extends EnumHelper<typeof Gender> {
  constructor() {
    super(Gender);
  }

  // 获取性别显示文本
  getDisplayText(value: Gender): string {
    switch (value) {
      case Gender.Male:
        return '男';
      case Gender.Female:
        return '女';
      case Gender.Secret:
        return '保密';
      default:
        return '未知';
    }
  }

  // 根据显示文本获取值
  getValueByDisplayText(text: string): Gender | undefined {
    switch (text) {
      case '男':
        return Gender.Male;
      case '女':
        return Gender.Female;
      case '保密':
        return Gender.Secret;
      default:
        return undefined;
    }
  }
}
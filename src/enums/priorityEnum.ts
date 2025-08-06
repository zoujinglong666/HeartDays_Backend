// 优先级枚举
export enum PriorityLevel {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2
}

// 枚举值与文本映射
export const PriorityText = {
  [PriorityLevel.LOW]: '低',
  [PriorityLevel.MEDIUM]: '中',
  [PriorityLevel.HIGH]: '高'
};
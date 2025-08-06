# 待办事项模块使用指南

## 功能特性

- 基本的待办事项管理（增删改查）
- 树形结构支持（父子待办事项）
- 拖拽排序功能
- 提醒功能（到期提醒）
- 模糊筛选
- 优先级管理

## API 接口

### 基本操作

- `POST /todos` - 创建待办事项
- `GET /todos` - 获取待办事项列表（支持分页、筛选）
- `GET /todos/:id` - 获取单个待办事项
- `GET /todos/:id/children` - 获取子待办事项
- `PATCH /todos/:id` - 更新待办事项
- `POST /todos/status` - 更新待办事项状态
- `DELETE /todos/:id` - 删除待办事项

### 拖拽排序

- `POST /todos/order` - 更新待办事项排序

### 提醒功能

- `GET /todos/reminders/upcoming` - 获取即将到期的提醒
- `GET /todos/reminders/due` - 获取已过期的提醒

## 前端集成示例

### 接收待办事项提醒通知

以下是使用 Socket.IO 接收待办事项提醒通知的示例代码：

```typescript
// 前端通知组件示例 (React + Socket.IO)
import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { notification } from 'antd';

interface TodoReminder {
  id: string;
  title: string;
  priority: number;
  reminderTime: string;
  type: 'upcoming' | 'due';
  message: string;
  time: string;
}

const NotificationComponent: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // 连接 WebSocket
    const socketInstance = io('http://localhost:3000', {
      extraHeaders: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    socketInstance.on('connect', () => {
      console.log('WebSocket 连接成功');
    });

    socketInstance.on('todoReminder', (data: TodoReminder) => {
      // 显示通知
      notification.open({
        message: data.type === 'upcoming' ? '待办事项即将到期' : '待办事项已过期',
        description: data.message,
        onClick: () => {
          // 点击通知跳转到待办事项详情
          console.log('跳转到待办事项详情', data.id);
        },
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return null; // 这是一个纯功能组件，不需要渲染任何内容
};

export default NotificationComponent;
```

### 拖拽排序实现示例

以下是使用 React DnD 实现待办事项拖拽排序的示例代码：

```typescript
// 前端拖拽排序示例 (React + React DnD)
import React, { useState, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import axios from 'axios';

interface TodoItem {
  id: string;
  title: string;
  done: boolean;
  priority: number;
  order: number;
}

const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);

  // 更新排序
  const updateOrder = useCallback(async (items: { id: string; order: number }[]) => {
    try {
      await axios.post('/api/todos/order', { items });
    } catch (error) {
      console.error('更新排序失败', error);
    }
  }, []);

  // 移动待办事项
  const moveTodo = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const draggedTodo = todos[dragIndex];
      const newTodos = [...todos];
      newTodos.splice(dragIndex, 1);
      newTodos.splice(hoverIndex, 0, draggedTodo);

      // 更新顺序值
      const updatedTodos = newTodos.map((todo, index) => ({
        ...todo,
        order: index,
      }));

      setTodos(updatedTodos);

      // 发送更新请求
      updateOrder(
        updatedTodos.map((todo) => ({
          id: todo.id,
          order: todo.order,
        }))
      );
    },
    [todos, updateOrder]
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="todo-list">
        {todos.map((todo, index) => (
          <DraggableTodoItem
            key={todo.id}
            index={index}
            todo={todo}
            moveTodo={moveTodo}
          />
        ))}
      </div>
    </DndProvider>
  );
};

interface DraggableTodoItemProps {
  todo: TodoItem;
  index: number;
  moveTodo: (dragIndex: number, hoverIndex: number) => void;
}

const DraggableTodoItem: React.FC<DraggableTodoItemProps> = ({ todo, index, moveTodo }) => {
  const ref = React.useRef<HTMLDivElement>(null);

  const [, drop] = useDrop({
    accept: 'TODO_ITEM',
    hover(item: { index: number }, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      moveTodo(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: 'TODO_ITEM',
    item: { id: todo.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`todo-item ${isDragging ? 'dragging' : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <input
        type="checkbox"
        checked={todo.done}
        onChange={() => {}}
      />
      <span className={todo.done ? 'done' : ''}>{todo.title}</span>
    </div>
  );
};

export default TodoList;
```

## 数据库表结构

```sql
CREATE TABLE todo_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  priority SMALLINT DEFAULT 1,
  expanded BOOLEAN DEFAULT TRUE,
  parent_id UUID REFERENCES todo_items(id),
  order INTEGER DEFAULT 0,
  reminder_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
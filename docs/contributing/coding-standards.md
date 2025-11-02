# Rubick 代码规范

## 概述

本文档定义了 Rubick 项目的代码规范和最佳实践，旨在保持代码的一致性、可读性和可维护性。

## 代码风格

### JavaScript/TypeScript

#### 命名约定

1. **变量和函数**：使用 camelCase
   ```javascript
   const userName = 'john';
   const getUserInfo = () => {};
   ```

2. **常量**：使用 UPPER_SNAKE_CASE
   ```javascript
   const MAX_RETRY_COUNT = 3;
   const API_BASE_URL = 'https://api.example.com';
   ```

3. **类名**：使用 PascalCase
   ```javascript
   class UserManager {
     constructor() {}
   }
   ```

4. **文件名**：使用 kebab-case
   ```
   user-manager.js
   plugin-handler.js
   ```

#### 代码格式

1. **缩进**：使用 2 个空格
2. **分号**：不使用分号
3. **引号**：使用单引号
4. **逗号**：不使用尾随逗号

```javascript
// 好的示例
const getUserData = (userId) => {
  if (!userId) {
    return null
  }
  
  return {
    id: userId,
    name: 'John Doe',
    email: 'john@example.com'
  }
}

// 不好的示例
const getUserData = (userId) => {
  if (!userId) {
    return null;
  };
  
  return {
    id: userId,
    name: "John Doe",
    email: "john@example.com",
  };
};
```

#### 函数定义

1. **箭头函数**：优先使用箭头函数
   ```javascript
   const add = (a, b) => a + b;
   ```

2. **函数声明**：对于需要提升的函数，使用函数声明
   ```javascript
   function calculateTotal(items) {
     return items.reduce((sum, item) => sum + item.price, 0);
   }
   ```

3. **参数**：使用默认参数而不是参数检查
   ```javascript
   // 好的示例
   const createUser = (name = 'Anonymous', age = 0) => {
     return { name, age };
   };
   
   // 不好的示例
   const createUser = (name, age) => {
     name = name || 'Anonymous';
     age = age || 0;
     return { name, age };
   };
   ```

#### 对象和数组

1. **对象字面量**：使用简写属性
   ```javascript
   const name = 'John';
   const age = 30;
   
   // 好的示例
   const user = { name, age };
   
   // 不好的示例
   const user = { name: name, age: age };
   ```

2. **数组方法**：优先使用数组方法而不是循环
   ```javascript
   // 好的示例
   const activeUsers = users.filter(user => user.isActive);
   const userNames = users.map(user => user.name);
   
   // 不好的示例
   const activeUsers = [];
   for (let i = 0; i < users.length; i++) {
     if (users[i].isActive) {
       activeUsers.push(users[i]);
     }
   }
   ```

#### 条件语句

1. **三元运算符**：用于简单的条件赋值
   ```javascript
   const message = isSuccess ? '操作成功' : '操作失败';
   ```

2. **逻辑或**：用于提供默认值
   ```javascript
   const userName = user.name || 'Anonymous';
   ```

3. **早期返回**：减少嵌套
   ```javascript
   // 好的示例
   function validateUser(user) {
     if (!user) {
       return false;
     }
     
     if (!user.email) {
       return false;
     }
     
     return true;
   }
   
   // 不好的示例
   function validateUser(user) {
     if (user) {
       if (user.email) {
         return true;
       }
     }
     return false;
   }
   ```

### Vue 组件

#### 组件命名

1. **组件文件名**：使用 PascalCase
   ```
   UserProfile.vue
   SearchResults.vue
   ```

2. **组件注册名**：使用 kebab-case
   ```javascript
   export default {
     name: 'user-profile'
   }
   ```

#### 组件结构

```vue
<template>
  <!-- 模板内容 -->
</template>

<script>
export default {
  name: 'ComponentName',
  
  components: {},
  
  props: {},
  
  data() {
    return {};
  },
  
  computed: {},
  
  watch: {},
  
  methods: {},
  
  created() {},
  
  mounted() {},
  
  beforeDestroy() {}
};
</script>

<style lang="less" scoped>
/* 样式内容 */
</style>
```

#### Props 定义

```javascript
export default {
  props: {
    // 基础类型检查
    title: String,
    
    // 多种类型检查
    value: [String, Number],
    
    // 必填字段
    requiredProp: {
      type: String,
      required: true
    },
    
    // 带默认值
    optionalProp: {
      type: String,
      default: 'default value'
    },
    
    // 对象/数组默认值应当从一个工厂函数获取
    objectProp: {
      type: Object,
      default: () => ({
        key: 'value'
      })
    },
    
    // 自定义验证函数
    customProp: {
      validator: function (value) {
        return ['success', 'warning', 'danger'].includes(value);
      }
    }
  }
};
```

#### 事件处理

```javascript
export default {
  methods: {
    // 好的示例：使用方法引用
    handleClick() {
      // 处理点击
    },
    
    // 好的示例：带参数的方法
    handleItemClick(item) {
      // 处理项目点击
    }
  }
};
```

```html
<!-- 好的示例 -->
<button @click="handleClick">Click me</button>
<button @click="handleItemClick(item)">Click item</button>

<!-- 不好的示例 -->
<button @click="() => handleClick()">Click me</button>
<button @click="handleItemClick(item, $event)">Click item</button>
```

### CSS/Less

#### 命名约定

1. **类名**：使用 kebab-case
   ```css
   .user-profile {
     /* 样式 */
   }
   
   .search-results {
     /* 样式 */
   }
   ```

2. **BEM 命名**：推荐使用 BEM 命名约定
   ```css
   .block {
     /* 块样式 */
   }
   
   .block__element {
     /* 元素样式 */
   }
   
   .block--modifier {
     /* 修饰符样式 */
   }
   ```

#### 样式组织

```less
// 变量定义
@primary-color: #1890ff;
@text-color: #333;
@border-radius: 4px;

// 混合定义
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

// 组件样式
.user-profile {
  .flex-center;
  
  padding: 16px;
  border-radius: @border-radius;
  background-color: #fff;
  
  &__avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
  }
  
  &__info {
    margin-left: 12px;
    
    &__name {
      font-size: 16px;
      font-weight: bold;
      color: @text-color;
    }
    
    &__email {
      font-size: 14px;
      color: #666;
    }
  }
  
  &--active {
    border: 1px solid @primary-color;
  }
}
```

## TypeScript 规范

### 类型定义

1. **接口命名**：使用 PascalCase，以 I 开头（可选）
   ```typescript
   interface User {
     id: number;
     name: string;
     email: string;
   }
   
   // 或者
   interface IUser {
     id: number;
     name: string;
     email: string;
   }
   ```

2. **类型别名**：使用 PascalCase
   ```typescript
   type UserID = number;
   type UserRole = 'admin' | 'user' | 'guest';
   ```

3. **枚举**：使用 PascalCase
   ```typescript
   enum UserStatus {
     Active = 'active',
     Inactive = 'inactive',
     Pending = 'pending'
   }
   ```

### 函数类型

```typescript
// 函数声明
function getUser(id: number): Promise<User> {
  return fetch(`/api/users/${id}`).then(res => res.json());
}

// 箭头函数
const createUser = (userData: CreateUserRequest): Promise<User> => {
  return fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(userData)
  }).then(res => res.json());
};

// 函数类型
type EventHandler<T> = (event: T) => void;
```

### 组件类型

```typescript
import { defineComponent, PropType } from 'vue';

export default defineComponent({
  name: 'UserProfile',
  
  props: {
    user: {
      type: Object as PropType<User>,
      required: true
    },
    
    onUpdate: {
      type: Function as PropType<(user: User) => void>,
      default: () => {}
    }
  },
  
  setup(props) {
    const handleClick = () => {
      props.onUpdate(props.user);
    };
    
    return {
      handleClick
    };
  }
});
```

## 文件组织

### 目录结构

```
src/
├── components/          # 通用组件
│   ├── common/         # 基础组件
│   └── business/       # 业务组件
├── views/              # 页面组件
├── store/              # 状态管理
├── utils/              # 工具函数
├── api/                # API 接口
├── assets/             # 静态资源
└── types/              # 类型定义
```

### 文件命名

1. **组件文件**：使用 PascalCase
   ```
   UserProfile.vue
   SearchResults.vue
   ```

2. **工具文件**：使用 kebab-case
   ```
   date-utils.js
   api-client.js
   ```

3. **类型文件**：使用 kebab-case
   ```
   user-types.ts
   api-types.ts
   ```

### 导入导出

1. **导入顺序**：
   ```javascript
   // 1. 第三方库
   import Vue from 'vue';
   import { mapState } from 'vuex';
   
   // 2. 内部模块
   import { formatDate } from '@/utils/date';
   import { getUserById } from '@/api/users';
   
   // 3. 相对路径
   import './styles.less';
   ```

2. **导出方式**：
   ```javascript
   // 命名导出
   export const formatDate = (date) => { /* ... */ };
   export const parseDate = (str) => { /* ... */ };
   
   // 默认导出
   export default {
     formatDate,
     parseDate
   };
   ```

## 注释规范

### JSDoc 注释

```javascript
/**
 * 计算两个数字的和
 * @param {number} a - 第一个数字
 * @param {number} b - 第二个数字
 * @returns {number} 两个数字的和
 * @example
 * // 返回 5
 * add(2, 3);
 */
const add = (a, b) => a + b;
```

### 组件注释

```javascript
/**
 * 用户资料组件
 * @component
 * @example
 * <user-profile :user="userData" @update="handleUpdate" />
 */
export default {
  name: 'UserProfile',
  
  props: {
    /**
     * 用户数据
     * @type {Object}
     * @required
     */
    user: {
      type: Object,
      required: true
    }
  },
  
  methods: {
    /**
     * 处理更新事件
     * @param {Object} user - 更新后的用户数据
     */
    handleUpdate(user) {
      this.$emit('update', user);
    }
  }
};
```

### 行内注释

```javascript
// 检查用户是否已登录
if (user.isLoggedIn) {
  // 显示用户菜单
  showUserMenu();
}

// TODO: 优化这个算法的性能
const result = expensiveOperation(data);

// FIXME: 这里有一个已知的 Bug
const temp = workaroundForBug(data);
```

## 性能优化

### Vue 组件优化

1. **v-if vs v-show**：
   ```html
   <!-- 好的示例：条件很少改变时使用 v-if -->
   <div v-if="showDetails">详细信息</div>
   
   <!-- 好的示例：频繁切换时使用 v-show -->
   <div v-show="isVisible">内容</div>
   ```

2. **key 属性**：
   ```html
   <!-- 好的示例：为列表项提供唯一的 key -->
   <div v-for="item in items" :key="item.id">
     {{ item.name }}
   </div>
   ```

3. **计算属性缓存**：
   ```javascript
   export default {
     computed: {
       // 好的示例：使用计算属性缓存结果
       filteredItems() {
         return this.items.filter(item => item.isActive);
       }
     }
   }
   ```

### JavaScript 优化

1. **避免不必要的计算**：
   ```javascript
   // 好的示例：缓存计算结果
   const expensiveValue = expensiveCalculation();
   
   // 不好的示例：重复计算
   for (let i = 0; i < 1000; i++) {
     const result = expensiveCalculation();
   }
   ```

2. **事件监听器优化**：
   ```javascript
   // 好的示例：使用事件委托
   document.addEventListener('click', (event) => {
     if (event.target.matches('.button')) {
       handleClick(event);
     }
   });
   
   // 不好的示例：为每个按钮添加监听器
   buttons.forEach(button => {
     button.addEventListener('click', handleClick);
   });
   ```

## 安全规范

### XSS 防护

```javascript
// 好的示例：使用文本插值
<div>{{ userContent }}</div>

// 不好的示例：使用 HTML 插值
<div v-html="userContent"></div>

// 如果必须使用 v-html，先进行转义
const escapeHtml = (str) => {
  return str.replace(/[&<>"']/g, (match) => {
    const escape = {
      '&': '&',
      '<': '<',
      '>': '>',
      '"': '"',
      "'": '''
    };
    return escape[match];
  });
};
```

### 输入验证

```javascript
// 好的示例：验证用户输入
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 好的示例：清理用户输入
const sanitizeInput = (input) => {
  return input.trim().replace(/[<>]/g, '');
};
```

## 测试规范

### 单元测试

```javascript
// 好的测试示例
describe('UserUtils', () => {
  describe('formatUserName', () => {
    test('should format user name correctly', () => {
      const user = {
        firstName: 'John',
        lastName: 'Doe'
      };
      
      expect(formatUserName(user)).toBe('John Doe');
    });
    
    test('should handle missing last name', () => {
      const user = {
        firstName: 'John'
      };
      
      expect(formatUserName(user)).toBe('John');
    });
    
    test('should handle empty user object', () => {
      expect(formatUserName({})).toBe('');
    });
  });
});
```

### 组件测试

```javascript
import { mount } from '@vue/test-utils';
import UserProfile from '@/components/UserProfile.vue';

describe('UserProfile', () => {
  test('renders user information correctly', () => {
    const user = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com'
    };
    
    const wrapper = mount(UserProfile, {
      props: { user }
    });
    
    expect(wrapper.text()).toContain('John Doe');
    expect(wrapper.text()).toContain('john@example.com');
  });
  
  test('emits update event when edit button is clicked', async () => {
    const user = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com'
    };
    
    const wrapper = mount(UserProfile, {
      props: { user }
    });
    
    await wrapper.find('.edit-button').trigger('click');
    
    expect(wrapper.emitted().update).toBeTruthy();
    expect(wrapper.emitted().update[0]).toEqual([user]);
  });
});
```

## 工具配置

### ESLint 配置

项目使用 ESLint 来检查代码质量，配置文件位于 `.eslintrc.js`：

```javascript
module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es6: true
  },
  extends: [
    'plugin:vue/vue3-essential',
    '@vue/standard',
    '@vue/typescript/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020
  },
  rules: {
    // 自定义规则
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
  }
};
```

### Prettier 配置

项目使用 Prettier 来格式化代码，配置文件位于 `.prettierrc`：

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "none",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### Git Hooks

项目使用 Husky 来设置 Git Hooks，确保提交的代码符合规范：

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{js,ts,vue}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ]
  }
}
```

## 更多资源

- [Vue.js 风格指南](https://vuejs.org/v2/style-guide/)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)
- [ESLint 规则](https://eslint.org/docs/rules/)
- [Prettier 选项](https://prettier.io/docs/en/options.html)
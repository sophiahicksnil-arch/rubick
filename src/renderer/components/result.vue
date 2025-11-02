<template>
  <div v-show="!currentPlugin.name" class="options">
    <div
      class="history-plugins"
      v-if="
        !options.length &&
        !searchValue &&
        !clipboardFile.length &&
        historyEnabled
      "
    >
      <a-row>
        <a-col
          @click="() => openPlugin(item)"
          @contextmenu.prevent="openMenu($event, item)"
          :class="
            currentSelect === index ? 'active history-item' : 'history-item'
          "
          :span="3"
          v-for="(item, index) in pluginHistory"
          :key="index"
        >
          <a-avatar style="width: 28px; height: 28px" :src="item.icon" />
          <div class="name ellpise">
            {{ item.cmd || item.pluginName || item._name || item.name }}
          </div>
          <div class="badge" v-if="item.pin"></div>
        </a-col>
      </a-row>
    </div>

    <!-- 搜索结果区域 -->
    <div
      v-else-if="
        sortedOptions.bestMatches.length || sortedOptions.recommendations.length
      "
      class="search-results"
    >
      <!-- 最佳匹配区域 -->
      <div
        class="best-matches-section"
        v-if="sortedOptions.bestMatches.length > 0"
      >
        <div class="section-title">最佳匹配</div>
        <div class="grid-container">
          <div
            v-for="(item, index) in sortedOptions.bestMatches"
            :key="index"
            @click="() => item.click && item.click()"
            :class="currentSelect === index ? 'grid-item active' : 'grid-item'"
          >
            <div class="icon-container">
              <img :src="item.icon" class="app-icon" />
              <div class="best-match-badge">最佳</div>
            </div>
            <div class="app-name">{{ item.name }}</div>
          </div>
        </div>
      </div>

      <!-- 推荐区域 -->
      <div
        class="recommendations-section"
        v-if="
          sortedOptions.recommendations &&
          sortedOptions.recommendations.length > 0
        "
      >
        <div class="section-title">推荐</div>
        <div class="grid-container">
          <div
            v-for="(item, index) in sortedOptions.recommendations"
            :key="index"
            @click="() => item.click && item.click()"
            :class="
              currentSelect === index + sortedOptions.bestMatches.length
                ? 'grid-item active'
                : 'grid-item'
            "
          >
            <div class="icon-container">
              <img :src="item.icon" class="app-icon" />
            </div>
            <div class="app-name">{{ item.name }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 原始结果列表（作为后备） -->
    <a-list v-else item-layout="horizontal" :dataSource="sort(options).all">
      <template #renderItem="{ item, index }">
        <a-list-item
          @click="() => item.click && item.click()"
          :class="currentSelect === index ? 'active op-item' : 'op-item'"
        >
          <a-list-item-meta :description="renderDesc(item.desc)">
            <template #title>
              <span v-html="renderTitle(item.name, item.match)"></span>
            </template>
            <template #avatar>
              <a-avatar style="border-radius: 0" :src="item.icon" />
            </template>
          </a-list-item-meta>
        </a-list-item>
      </template>
    </a-list>
  </div>
</template>

<script lang="ts" setup>
import { defineEmits, defineProps, reactive, ref, toRaw, computed } from 'vue';
import localConfig from '../confOp';
import { Menu } from '@electron/remote';
import path from 'path';

declare const __static: string;

type PerfCommon = {
  history?: boolean;
  lang?: string;
  hideOnBlur?: boolean;
};
type ConfigLike = {
  perf?: {
    common?: PerfCommon;
    custom?: Record<string, unknown>;
  };
};

const config = ref<ConfigLike>(
  localConfig.getConfig() as unknown as ConfigLike
);

const historyEnabled = computed(
  () =>
    !!(
      config.value &&
      config.value.perf &&
      config.value.perf.common &&
      config.value.perf.common.history
    )
);

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const props: any = defineProps({
  searchValue: {
    type: [String, Number],
    default: '',
  },
  options: {
    type: Array,
    default: () => [],
  },
  currentSelect: {
    type: Number,
    default: 0,
  },
  currentPlugin: {
    type: Object,
    default: () => ({}),
  },
  pluginHistory: {
    type: Array,
    default: () => [],
  },
  clipboardFile: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['choosePlugin', 'setPluginHistory']);

// 添加计算属性
const sortedOptions = computed(() => {
  return sort(props.options);
});

const renderTitle = (title, match) => {
  if (typeof title !== 'string') return;
  if (!props.searchValue || !match) return title;
  const result = title.substring(match[0], match[1] + 1);
  return `<div>${title.substring(
    0,
    match[0]
  )}<span style='color: var(--ant-error-color)'>${result}</span>${title.substring(
    match[1] + 1,
    title.length
  )}</div>`;
};

const renderDesc = (desc = '') => {
  if (desc.length > 80) {
    return `${desc.substr(0, 63)}...${desc.substr(
      desc.length - 14,
      desc.length
    )}`;
  }
  return desc;
};

const sort = (options) => {
  // 非破坏性排序：复制后排序，避免原数组副作用
  const cloned = options.slice();

  // 分类优先级：用户安装的应用/插件优先，文件次之，系统插件/应用最后
  const categoryRank = (item) => {
    // 明确识别系统插件/应用
    if (item.pluginType === 'system' || item.name === 'rubick-system-feature')
      return 2;
    // 用户安装的应用或插件
    if (item.pluginType === 'app' || item.value === 'plugin') return 0;
    // 其他（如文件）
    return 1;
  };

  const getZ = (x) => (typeof x.zIndex === 'number' ? x.zIndex : 0);

  // 综合排序：先按类别，再按 zIndex（降序），再按是否最佳匹配，最后按名称
  cloned.sort((a, b) => {
    const ra = categoryRank(a);
    const rb = categoryRank(b);
    if (ra !== rb) return ra - rb;
    const za = getZ(a);
    const zb = getZ(b);
    if (za !== zb) return zb - za;
    if (a.isBestMatch !== b.isBestMatch) return a.isBestMatch ? -1 : 1;
    const an = (a.name || '').toString();
    const bn = (b.name || '').toString();
    return an.localeCompare(bn);
  });

  // 将结果分为最佳匹配和推荐（保持“系统在后”的排序）
  const bestMatches = cloned
    .filter(
      (item) =>
        item.isBestMatch &&
        (item.pluginType === 'app' || item.value === 'plugin')
    )
    .sort((a, b) => {
      const ra = categoryRank(a);
      const rb = categoryRank(b);
      if (ra !== rb) return ra - rb;
      const za = getZ(a);
      const zb = getZ(b);
      if (za !== zb) return zb - za;
      const an = (a.name || '').toString();
      const bn = (b.name || '').toString();
      return an.localeCompare(bn);
    });

  const recommendations = cloned
    .filter(
      (item) =>
        !item.isBestMatch &&
        (item.pluginType === 'app' ||
          item.value === 'plugin' ||
          item.type === 'file')
    )
    .sort((a, b) => {
      const ra = categoryRank(a);
      const rb = categoryRank(b);
      if (ra !== rb) return ra - rb;
      const za = getZ(a);
      const zb = getZ(b);
      if (za !== zb) return zb - za;
      const an = (a.name || '').toString();
      const bn = (b.name || '').toString();
      return an.localeCompare(bn);
    });

  // 二次去重：按标准化名称在“推荐”中去重，并移除与“最佳匹配”同名项
  // 标准化规则：NFKC 归一化 + 小写 + 去零宽字符 + 去所有空白 + 去下划线/连字符
  const normalizeNameLocal = (s: string) =>
    (s || '')
      .toString()
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\u200b-\u200d\uFEFF]/g, '') // 零宽字符
      .replace(/\s+/g, '') // 所有空白
      .replace(/[_-]/g, ''); // 下划线/连字符

  const bestMatchNameSet = new Set(
    bestMatches.map((x) => normalizeNameLocal(x.name))
  );
  const recNameSeen = new Set<string>();
  const dedupedRecommendations = recommendations.filter((item) => {
    const key = normalizeNameLocal(item.name);
    if (bestMatchNameSet.has(key)) return false;
    if (recNameSeen.has(key)) return false;
    recNameSeen.add(key);
    return true;
  });

  // 限制数量
  const limitedBestMatches = bestMatches.slice(0, 5);
  const limitedRecommendations = dedupedRecommendations.slice(0, 15);

  return {
    bestMatches: limitedBestMatches,
    recommendations: limitedRecommendations,
    all: [...limitedBestMatches, ...limitedRecommendations],
  };
};

const openPlugin = (item) => {
  emit('choosePlugin', item);
};

type PluginLike = {
  name?: string;
  pin?: boolean;
  icon?: string;
};

const menuState = reactive<{ plugin: PluginLike | null }>({
  plugin: null,
});
let mainMenus: ReturnType<typeof Menu.buildFromTemplate>;

const iconPath = (name: string) => {
  try {
    // eslint-disable-next-line no-undef
    return typeof __static !== 'undefined'
      ? path.join(__static, 'icons', name)
      : undefined;
  } catch (e) {
    return undefined;
  }
};

const openMenu = (e, item) => {
  const pinToMain = mainMenus?.getMenuItemById('pinToMain');
  const unpinFromMain = mainMenus?.getMenuItemById('unpinFromMain');
  if (pinToMain) {
    pinToMain.visible = !item.pin;
  }
  if (unpinFromMain) {
    unpinFromMain.visible = item.pin;
  }
  mainMenus?.popup({
    x: e.pageX,
    y: e.pageY,
  });
  menuState.plugin = item;
};

const initMainCmdMenus = () => {
  const menu = [
    {
      id: 'removeRecentCmd',
      label: '从"使用记录"中删除',
      icon: iconPath('delete@2x.png'),
      click: () => {
        const current = menuState.plugin;
        if (!current) return;
        const history = props.pluginHistory.filter(
          (item) => item.name !== current.name
        );
        emit('setPluginHistory', toRaw(history));
      },
    },
    {
      id: 'pinToMain',
      label: '固定到"搜索面板"',
      icon: iconPath('pin@2x.png'),
      click: () => {
        const current = menuState.plugin;
        if (!current) return;
        const history = props.pluginHistory.map((item) => {
          if (item.name === current.name) {
            item.pin = true;
          }
          return item;
        });
        emit('setPluginHistory', toRaw(history));
      },
    },
    {
      id: 'unpinFromMain',
      label: '从"搜索面板"取消固定',
      icon: iconPath('unpin@2x.png'),
      click: () => {
        const current = menuState.plugin;
        if (!current) return;
        const history = props.pluginHistory.map((item) => {
          if (item.name === current.name) {
            item.pin = false;
          }
          return item;
        });
        emit('setPluginHistory', toRaw(history));
      },
    },
  ];
  mainMenus = Menu.buildFromTemplate(menu);
};

initMainCmdMenus();
</script>

<style lang="less">
.ellpise {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.contextmenu {
  margin: 0;
  background: #fff;
  z-index: 3000;
  position: absolute;
  list-style-type: none;
  padding: 5px 0;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 400;
  color: #333;
  box-shadow: 2px 2px 3px 0 rgba(0, 0, 0, 0.3);
}

.search-results {
  .section-title {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: bold;
    color: var(--color-text-desc);
    background: var(--color-body-bg);
    border-bottom: 1px solid var(--color-border-light);
  }

  .grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 16px;
    padding: 16px;
  }

  .grid-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;

    &:hover,
    &.active {
      background: var(--color-list-hover);
    }

    .icon-container {
      position: relative;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;

      .app-icon {
        width: 48px;
        height: 48px;
        object-fit: contain;
      }

      .best-match-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: var(--ant-primary-color);
        color: white;
        font-size: 8px;
        padding: 2px 4px;
        border-radius: 8px;
        line-height: 1;
      }
    }

    .app-name {
      font-size: 12px;
      text-align: center;
      color: var(--color-text-content);
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.options {
  position: absolute;
  top: 60px;
  left: 0;
  width: 100%;
  z-index: 99;
  max-height: calc(~'100vh - 60px');
  overflow: auto;
  background: var(--color-body-bg);
  .history-plugins {
    width: 100%;
    //border-top: 1px dashed var(--color-border-light);
    box-sizing: border-box;
    .history-item {
      cursor: pointer;
      box-sizing: border-box;
      height: 69px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      color: var(--color-text-content);
      //border-right: 1px dashed var(--color-border-light);
      position: relative;
      .badge {
        position: absolute;
        top: 2px;
        right: 2px;
        width: 0;
        height: 0;
        border-radius: 4px;
        border-top: 6px solid var(--ant-primary-4);
        border-right: 6px solid var(--ant-primary-4);
        border-left: 6px solid transparent;
        border-bottom: 6px solid transparent;
      }
      &.active {
        background: var(--color-list-hover);
      }
    }
    .name {
      font-size: 12px;
      margin-top: 4px;
      width: 100%;
      text-align: center;
    }
  }
  .op-item {
    padding: 0 10px;
    height: 70px;
    line-height: 50px;
    max-height: 500px;
    overflow: auto;
    background: var(--color-body-bg);
    color: var(--color-text-content);
    border-color: var(--color-border-light);
    border-bottom: 1px solid var(--color-border-light) !important;
    &.active {
      background: var(--color-list-hover);
    }
    .ant-list-item-meta-title {
      color: var(--color-text-content);
    }
    .ant-list-item-meta-description {
      color: var(--color-text-desc);
    }
  }
}
</style>

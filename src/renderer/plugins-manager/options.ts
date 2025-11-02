/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref, watch } from 'vue';
import type { Ref } from 'vue';
import debounce from 'lodash.debounce';
import { ipcRenderer } from 'electron';
import { getGlobal } from '@electron/remote';
import PinyinMatch from 'pinyin-match';
import pluginClickEvent from './pluginClickEvent';
import useFocus from './clipboardWatch';

// Types
export type OptionItem = {
  name?: string;
  value?: string;
  icon?: string;
  desc?: string;
  type?: string;
  pluginType?: string;
  match?: unknown;
  zIndex?: number;
  isBestMatch?: boolean;
  pluginName?: string;
  featureCode?: string;
  cmdType?: string;
  click?: () => void;
  [key: string]: unknown;
};

export type AppEntry = {
  pluginType: 'app';
  name: string;
  _name?: string;
  desc?: string;
  action?: string;
  icon?: string;
  keyWords: string[];
  match?: unknown;
  isBestMatch?: boolean;
};

export type OptionsManagerArgs = {
  searchValue: Ref<string>;
  appList: Ref<AppEntry[]>;
  openPlugin: (plugin: Record<string, unknown>, option: OptionItem) => void;
  currentPlugin: Ref<Record<string, unknown>>;
};

function formatReg(regStr) {
  const flags = regStr.replace(/.*\/([gimy]*)$/, '$1');
  const pattern = regStr.replace(new RegExp('^/(.*?)/' + flags + '$'), '$1');
  return new RegExp(pattern, flags);
}

// 导入拼音库
import translate from '../../core/app-search/translate';

function getFirstLetterAbbreviation(str) {
  // 提取字符串中每个词的首字母，生成缩写
  if (!str) return '';

  // 如果是中文，使用拼音首字母
  const isZhRegex = /[\u4e00-\u9fa5]/;
  if (isZhRegex.test(str)) {
    try {
      // 使用翻译库获取拼音
      const result = translate(str);
      if (result && result[1]) {
        // result[1] 是拼音数组
        return result[1].map((py) => py.charAt(0).toUpperCase()).join('');
      }
    } catch (e) {
      // 如果无法获取拼音，返回空字符串
      console.log('获取拼音失败:', e);
    }
  }

  // 如果是英文或获取拼音失败，提取每个单词的首字母
  return str
    .split(/[\s\-_]+/)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

function searchKeyValues(lists, value, strict = false) {
  return lists.filter((item) => {
    if (typeof item === 'string') {
      // 转换为小写进行比较
      const lowerValue = value.toLowerCase();

      // 检查原始匹配
      const originalMatch = !!PinyinMatch.match(item, value);

      // 检查首字母简称匹配
      const firstLetterMatch = getFirstLetterAbbreviation(item)
        .toLowerCase()
        .includes(lowerValue);

      return originalMatch || firstLetterMatch;
    }
    if (item.type === 'regex' && !strict) {
      return formatReg(item.match).test(value);
    }
    if (item.type === 'over' && !strict) {
      return true;
    }
    return false;
  });
}

/**
 * 结果去重：避免同一 App 或同一命令重复出现
 * - App：按真实路径/动作唯一（优先 desc=path，其次 action），不受 name 影响
 * - 插件命令：按 icon + 规范化 name + type 唯一（忽略 desc，以消除同命令不同描述的重复）
 */
function normalizeName(s: string) {
  return (s || '').toString().toLowerCase().trim();
}
function dedupeOptions(list: OptionItem[]): OptionItem[] {
  const seen = new Map<string, boolean>();
  return list.filter((opt) => {
    const key =
      opt.pluginType === 'app'
        ? `app:${opt.desc || opt.action || opt.name}`
        : `plugin:${opt.pluginName || ''}:${
            opt.featureCode || ''
          }:${normalizeName((opt.name || '') as string)}:${
            opt.cmdType || opt.type || ''
          }`;
    if (seen.has(key)) return false;
    seen.set(key, true);
    return true;
  });
}

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
const optionsManager = ({
  searchValue,
  appList,
  openPlugin,
  currentPlugin,
}: OptionsManagerArgs) => {
  const optionsRef = ref<OptionItem[]>([]);

  // 全局快捷键
  ipcRenderer.on('global-short-key', (e, msg) => {
    const options = getOptionsFromSearchValue(msg, true);
    if (options && options.length) {
      options[0]?.click?.();
    }
  });

  const getIndex = (cmd, value) => {
    let index = 0;
    if (PinyinMatch.match(cmd.label || cmd, value)) {
      index += 1;
    }
    if (cmd.label) {
      index -= 1;
    }
    return index;
  };

  const getOptionsFromSearchValue = (
    value: string,
    strict = false
  ): OptionItem[] => {
    const localPlugins = getGlobal('LOCAL_PLUGINS').getLocalPlugins();
    let options: OptionItem[] = [];

    // 插件搜索逻辑
    localPlugins.forEach((plugin) => {
      const feature = plugin.features;
      if (!feature) return;
      feature.forEach((fe) => {
        const cmds = searchKeyValues(fe.cmds, value, strict);
        options = [
          ...options,
          ...cmds.map((cmd) => {
            const match = PinyinMatch.match(cmd.label || cmd, value);
            const isExactMatch =
              match &&
              match[0] === 0 &&
              match[1] === (cmd.label || cmd).length - 1;
            const isStartsWithMatch = match && match[0] === 0;

            const option = {
              name: cmd.label || cmd,
              value: 'plugin',
              icon: plugin.logo,
              desc: fe.explain,
              type: plugin.pluginType,
              match: match,
              zIndex: getIndex(cmd, value),
              isBestMatch:
                isExactMatch ||
                (isStartsWithMatch && (cmd.label || cmd).length <= 5), // 完全匹配或短词开头匹配
              // 用于去重的来源信息
              pluginName: plugin.name,
              featureCode: fe.code,
              cmdType: cmd.type || 'text',
              click: () => {
                pluginClickEvent({
                  plugin,
                  fe,
                  cmd,
                  ext: cmd.type
                    ? {
                        code: fe.code,
                        type: cmd.type || 'text',
                        payload: searchValue.value,
                      }
                    : null,
                  openPlugin,
                  option,
                });
              },
            };
            return option;
          }),
        ];
      });
    });

    // 应用搜索逻辑
    const appPlugins = appList.value || [];
    const descMap: Map<string, boolean> = new Map();
    options = [
      ...options,
      ...appPlugins
        .filter((plugin) => {
          const uniqueKey = plugin.desc || plugin.action || plugin._name || plugin.name;
          let matched = false;

          plugin.keyWords.some((keyWord) => {
            // 转换为小写进行比较
            const lowerValue = value.toLowerCase();

            // 检查原始匹配
            const match = PinyinMatch.match(keyWord, value);
            // 检查首字母简称匹配
            const firstLetterMatch = getFirstLetterAbbreviation(keyWord)
              .toLowerCase()
              .includes(lowerValue);

            if (match || firstLetterMatch) {
              matched = true;
              plugin.name = keyWord;
              plugin.match = match;

              // 判断是否为最佳匹配
              const isExactMatch =
                match && match[0] === 0 && match[1] === keyWord.length - 1;
              const isStartsWithMatch = match && match[0] === 0;
              const isFirstLetterMatch = firstLetterMatch;
              plugin.isBestMatch =
                isExactMatch ||
                (isStartsWithMatch && keyWord.length <= 5) ||
                isFirstLetterMatch;

              return true;
            }
            return false;
          });

          if (!matched) return false;
          if (descMap.has(uniqueKey)) return false;
          descMap.set(uniqueKey, true);
          return true;
        })
        .map((plugin) => {
          const option = {
            ...plugin,
            zIndex: 0,
            click: () => {
              openPlugin(plugin, option);
            },
          };
          return option;
        }),
    ];

    // 文件搜索逻辑（移除同步遍历以避免 UI 阻塞）
    // 如需文件检索，请迁移到主进程（ipcMain.handle）或使用 Worker 异步实现

    return dedupeOptions(options);
  };

  watch(searchValue, () => search(searchValue.value));
  // search Input operation
  const search = debounce((value) => {
    if (currentPlugin.value.name) return;
    if (clipboardFile.value.length) return;
    if (!value) {
      optionsRef.value = [];
      return;
    }
    optionsRef.value = getOptionsFromSearchValue(value);
  }, 100);

  const setOptionsRef = (options: OptionItem[]) => {
    optionsRef.value = options;
  };

  const {
    searchFocus,
    clipboardFile,
    clearClipboardFile,
    readClipboardContent,
  } = useFocus({
    currentPlugin,
    optionsRef,
    openPlugin,
    setOptionsRef,
  });

  return {
    setOptionsRef,
    options: optionsRef,
    searchFocus,
    clipboardFile,
    clearClipboardFile,
    readClipboardContent,
  };
};

export default optionsManager;

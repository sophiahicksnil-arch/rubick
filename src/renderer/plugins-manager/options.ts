import { ref, watch } from 'vue';
import debounce from 'lodash.debounce';
import { ipcRenderer } from 'electron';
import { getGlobal } from '@electron/remote';
import PinyinMatch from 'pinyin-match';
import pluginClickEvent from './pluginClickEvent';
import useFocus from './clipboardWatch';

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
      const lowerItem = item.toLowerCase();
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

const optionsManager = ({
  searchValue,
  appList,
  openPlugin,
  currentPlugin,
}) => {
  const optionsRef = ref([]);

  // 全局快捷键
  ipcRenderer.on('global-short-key', (e, msg) => {
    const options = getOptionsFromSearchValue(msg, true);
    options[0].click();
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

  const getOptionsFromSearchValue = (value, strict = false) => {
    const localPlugins = getGlobal('LOCAL_PLUGINS').getLocalPlugins();
    let options: any = [];

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
    const descMap = new Map();
    options = [
      ...options,
      ...appPlugins
        .filter((plugin) => {
          if (!descMap.get(plugin)) {
            descMap.set(plugin, true);
            let has = false;
            plugin.keyWords.some((keyWord) => {
              // 转换为小写进行比较
              const lowerKeyWord = keyWord.toLowerCase();
              const lowerValue = value.toLowerCase();

              // 检查原始匹配
              const match = PinyinMatch.match(keyWord, value);
              // 检查首字母简称匹配
              const firstLetterMatch = getFirstLetterAbbreviation(keyWord)
                .toLowerCase()
                .includes(lowerValue);

              if (match || firstLetterMatch) {
                has = keyWord;
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
            return has;
          } else {
            return false;
          }
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

    // 文件搜索逻辑 - 搜索本地文件系统中的文件
    // 这里我们添加一个简单的文件搜索功能
    if (value && value.length > 2) {
      // 只有当搜索词长度大于2时才搜索文件
      try {
        const fs = window.require('fs');
        const path = window.require('path');
        const os = window.require('os');

        // 搜索用户主目录下的文件
        const homeDir = os.homedir();
        const searchDirs = [homeDir];

        searchDirs.forEach((dir) => {
          if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir, { withFileTypes: true });
            files.forEach((file) => {
              if (file.name.toLowerCase().includes(value.toLowerCase())) {
                const filePath = path.join(dir, file.name);
                const fileOption = {
                  name: file.name,
                  value: 'file',
                  icon: file.isDirectory()
                    ? require('../assets/folder.png')
                    : require('../assets/file.png'),
                  desc: filePath,
                  type: 'file',
                  match: PinyinMatch.match(file.name, value),
                  zIndex: 0,
                  isBestMatch: false, // 文件不作为最佳匹配
                  click: () => {
                    // 打开文件或文件夹
                    const { shell } = window.require('electron');
                    shell.openPath(filePath);
                  },
                };
                options.push(fileOption);
              }
            });
          }
        });
      } catch (e) {
        // 如果文件搜索失败，忽略错误
        console.log('文件搜索失败:', e);
      }
    }

    return options;
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

  const setOptionsRef = (options) => {
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

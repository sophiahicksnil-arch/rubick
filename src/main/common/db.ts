import { LocalDb } from '@/core';
import { app } from 'electron';

let dbInstance: LocalDb | null = null;

/**
 * 惰性初始化 DB，避免在 app 未 ready 或打包时 electron 未注入导致的异常
 */
function getDb(): LocalDb {
  if (!dbInstance) {
    const userDataPath = app.getPath('userData');
    dbInstance = new LocalDb(userDataPath);
    dbInstance.init();
  }
  return dbInstance;
}

export default class DBInstance {
  public currentPlugin: null | any = null;
  private DBKEY = 'RUBICK_DB_DEFAULT';
  private DB_INFO_KET = 'RUBICK_PLUGIN_INFO';

  public async dbPut({ data }) {
    // 记录插件有哪些 dbkey，用于后续的数据同步
    if (this.currentPlugin && this.currentPlugin.name) {
      let dbInfo: any = await getDb().get(this.DBKEY, this.DB_INFO_KET);
      if (!dbInfo) {
        dbInfo = { data: [], _id: this.DB_INFO_KET };
      }
      const item = dbInfo.data.find(
        (it) => it.name === this.currentPlugin.name
      );
      if (item) {
        !item.keys.includes(data.data._id) && item.keys.push(data.data._id);
      } else {
        dbInfo.data.push({
          name: this.currentPlugin.name,
          keys: [data.data._id],
        });
      }
      await getDb().put(this.DBKEY, dbInfo);
    }
    return getDb().put(this.DBKEY, data.data);
  }

  public dbGet({ data }) {
    return getDb().get(this.DBKEY, data.id);
  }

  public dbRemove({ data }) {
    return getDb().remove(this.DBKEY, data.doc);
  }

  public dbBulkDocs({ data }) {
    return getDb().bulkDocs(this.DBKEY, data.docs);
  }

  public dbAllDocs({ data }) {
    return getDb().allDocs(this.DBKEY, data.key);
  }

  public dbDump({ data }) {
    return getDb().dumpDb(data.target);
  }

  public dbImport({ data }) {
    return getDb().importDb(data.target);
  }

  public dbPostAttachment({ data }) {
    const { docId, attachment, type } = data;
    return getDb().postAttachment(this.DBKEY, docId, attachment, type);
  }

  public dbGetAttachment({ data }) {
    return getDb().getAttachment(this.DBKEY, data.docId);
  }

  public async dbGetAttachmentType({ data }) {
    const res: any = await getDb().get(this.DBKEY, data.docId);
    if (!res || !res._attachments) return null;
    const keys = Object.keys(res._attachments || {});
    if (!keys.length) return null;
    const first = (res._attachments as any)[keys[0]];
    return first ? first.content_type : null;
  }
}

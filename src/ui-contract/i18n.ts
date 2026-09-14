import type { CherryI18n, CherryLocale, CherryMessageKey } from './index';

const messages: Readonly<Record<CherryLocale, Readonly<Record<CherryMessageKey, string>>>> = {
  ja: {
    'app.name': 'Cherry',
    'storage.title': 'この端末に保存しますか？',
    'storage.description':
      '許可すると、ワークスペースをこのブラウザに保存して次回起動時に復元できます。',
    'storage.allow': '保存を許可',
    'storage.notNow': '今はしない',
    'start.title': 'ワークスペース',
    'start.createWorkspace': '新しいワークスペース',
    'start.workspaceName': 'ワークスペース名',
    'workspace.board': 'ボード',
    'workspace.list': 'リスト',
    'task.create': 'タスクを追加',
    'task.edit': 'タスクを編集',
    'task.title': 'タイトル',
    'task.notes': 'メモ',
    'task.complete': '完了にする',
    'task.reopen': '未完了に戻す',
    'task.blockedByMerge': '前提タスクの完了待ち',
    'task.blockedDownstream': '前の合流タスクの完了待ち',
    'flow.connect': 'タスクをつなぐ',
    'flow.from': '接続元',
    'flow.to': '接続先',
    'flow.kind': '接続の種類',
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.confirm': '続行',
    'error.validation': '入力内容を確認してください。',
    'error.notFound': '対象が見つかりませんでした。',
    'error.conflict': '別の変更と競合しました。',
    'error.blocked': 'この操作は現在実行できません。',
    'error.stalePlan': '状態が変わったため、もう一度操作してください。',
    'error.persistence': '保存処理に失敗しました。',
    'error.unknown': '予期しないエラーが発生しました。',
    'confirmation.reopen.title': '完了状態が変更されます',
    'confirmation.reopen.message':
      'この変更により、完了済みのタスクが未完了に戻ります。続行しますか？',
  },
  en: {
    'app.name': 'Cherry',
    'storage.title': 'Save on this device?',
    'storage.description':
      'Allow Cherry to save workspaces in this browser and restore them on your next visit.',
    'storage.allow': 'Allow saving',
    'storage.notNow': 'Not now',
    'start.title': 'Workspaces',
    'start.createWorkspace': 'New workspace',
    'start.workspaceName': 'Workspace name',
    'workspace.board': 'Board',
    'workspace.list': 'List',
    'task.create': 'Add task',
    'task.edit': 'Edit task',
    'task.title': 'Title',
    'task.notes': 'Notes',
    'task.complete': 'Mark complete',
    'task.reopen': 'Mark incomplete',
    'task.blockedByMerge': 'Waiting for prerequisites',
    'task.blockedDownstream': 'Waiting for an earlier merge',
    'flow.connect': 'Connect tasks',
    'flow.from': 'From',
    'flow.to': 'To',
    'flow.kind': 'Connection type',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Continue',
    'error.validation': 'Check the entered values.',
    'error.notFound': 'The requested item could not be found.',
    'error.conflict': 'This change conflicts with another change.',
    'error.blocked': 'This action is currently unavailable.',
    'error.stalePlan': 'The workspace changed. Please try the action again.',
    'error.persistence': 'Cherry could not save your data.',
    'error.unknown': 'An unexpected error occurred.',
    'confirmation.reopen.title': 'Completed tasks will change',
    'confirmation.reopen.message':
      'This change will return completed tasks to incomplete. Continue?',
  },
};

function interpolate(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{([^}]+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

export function createCherryI18n(locale: CherryLocale): CherryI18n {
  return {
    locale,
    t(key, values = {}) {
      return interpolate(messages[locale][key], values);
    },
  };
}

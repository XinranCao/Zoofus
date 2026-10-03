import type { Messages } from "./en";

/** 简体中文。语气:简短、朴素、带一点温度;不用感叹号和表情符号。 */
export const zh: Messages = {
  common: {
    close: "关闭",
    cancel: "取消",
    back: "返回",
    save: "保存",
    delete: "删除",
    rename: "重命名",
    undo: "撤销",
    redo: "重做",
    reset: "重置",
    clear: "清空",
    loading: "加载中",
    language: "语言",
    menu: "菜单",
    goHome: "Zoofus 首页",
    optional: "可选",
  },
  nav: {
    make: "做贴纸",
    book: "我的贴纸本",
    tape: "胶带",
    profile: "账号",
    logIn: "登录",
    signUp: "注册",
    logOut: "退出登录",
    main: "主导航",
    accountMenu: "{{name}} 的账号菜单",
  },
  shell: {
    skip: "跳到正文",
  },
  notFound: {
    kicker: "页面不见了",
    title: "这一页从本子里掉出来了",
    body: "链接可能太旧了,或者这张贴纸已经删除。",
    action: "回到开头",
  },
  error: {
    kicker: "纸撕破了",
    title: "这一页没能打开",
    body: "什么都没有丢。回到开头再试一次。",
    action: "回到开头",
  },
  pageTitle: {
    home: "做贴纸",
    book: "我的贴纸本",
    tape: "胶带",
    account: "账号",
    logIn: "登录",
    signUp: "注册",
    notFound: "页面不见了",
  },
};

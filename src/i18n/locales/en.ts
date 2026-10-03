/** English copy. Rules: sentence case, verbs on buttons, no exclamation marks, no emoji. */
export const en = {
  common: {
    close: "Close",
    cancel: "Cancel",
    back: "Back",
    save: "Save",
    delete: "Delete",
    rename: "Rename",
    undo: "Undo",
    redo: "Redo",
    reset: "Reset",
    clear: "Clear",
    loading: "Loading",
    language: "Language",
    menu: "Menu",
    goHome: "Zoofus home",
    optional: "Optional",
  },
  nav: {
    make: "Make a sticker",
    book: "Sticker book",
    tape: "Tape",
    profile: "Account",
    logIn: "Log in",
    signUp: "Sign up",
    logOut: "Log out",
    main: "Main",
    accountMenu: "Account menu for {{name}}",
  },
  pageTitle: {
    home: "Make a sticker",
    book: "My sticker book",
    tape: "Tape",
    account: "Account",
    logIn: "Log in",
    signUp: "Sign up",
    notFound: "Page missing",
  },
};

export type Messages = typeof en;

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
  shell: {
    skip: "Skip to content",
  },
  notFound: {
    kicker: "Page missing",
    title: "This page fell out of the book",
    body: "The link may be old, or the sticker was deleted.",
    action: "Back to the start",
  },
  error: {
    kicker: "Something tore",
    title: "That page didn’t load",
    body: "Nothing was lost. Go back to the start and try again.",
    action: "Back to the start",
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

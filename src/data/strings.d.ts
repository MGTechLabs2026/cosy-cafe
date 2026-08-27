// Type contract for src/data/strings.json — keep in sync with the JSON.
// Writers edit the JSON; this file pins the shape the code compiles against.

export interface LetterEntry {
  title: string;
  body: string;
}

/** One scene line table: line1..lineN + optional choice copy. */
export interface SceneSection {
  [key: string]: string;
}

export interface UpgradeCopy {
  name: string;
  desc: string;
}

export interface CastMember {
  name: string;
  firstLine: string;
  desc: string;
}

export interface Strings {
  title: {
    gameName: string;
    pressAnyKey: string;
    continueLabel: string;
    newGameLabel: string;
    newGameConfirm: string;
  };
  hud: {
    dayTemplate: string;
    coinsTemplate: string;
    starsFull: string;
    starsEmpty: string;
    settingsLabel: string;
    journalLabel: string;
  };
  dialogue: {
    auntLetterTitle: string;
    auntLetterBody: string;
    letterSkip: string;
  };
  tutorial: {
    journalPulse: string;
    kettleGlint: string;
    firstCustomer: string;
    wrenUsual: string;
    wrenReaction: string;
  };
  settings: {
    title: string;
    close: string;
    relaxedMode: string;
    reducedMotion: string;
    masterVol: string;
    textSize: string;
    creditsTitle: string;
    versionLabel: string;
  };
  credits: {
    madeWith: string;
    assetsLine: string;
    licenseNote: string;
    thanks: string;
  };
  morning: {
    prepTitle: string;
    openDoors: string;
    sleepIn: string;
    deliveryArrived: string;
    shelfLineLabel: string;
  };
  mailbox: {
    title: string;
    singleHint: string;
    multipleHint: string;
    listLabel: string;
    dayLine: string;
    continue: string;
  };
  kettle: {
    title: string;
    base: string;
    ingredients: string;
    finish: string;
    hot: string;
    iced: string;
    foamed: string;
    brew: string;
    clear: string;
    murkyTitle: string;
    murkyLine: string;
    murkyNote: string;
    outOfStock: string;
    restockNote: string;
  };
  service: {
    fenwickArrives: string;
    fenwickFirstLine: string;
    fenwickOrderLine: string;
    arrivalTemplate: string;
    travelerArrives: string;
    chatButton: string;
    chatted: string;
    serveButton: string;
    servedHappy: string;
    servedFavorite: string;
    patienceOut: string;
    tipEarned: string;
    closeHint: string;
    closeDoor: string;
    taughtTemplate: string;
    taughtR003Title: string;
    taughtR003Body: string;
    taughtR004Body: string;
    taughtR005Body: string;
    taughtR006Body: string;
    taughtR007Body: string;
    wrenMysteryLine: string;
    wrenRevealToast: string;
    starUpToast: string;
    heartPuff: string;
  };
  recap: {
    title: string;
    coinsEarned: string;
    drinksServed: string;
    discoveries: string;
    noDiscoveries: string;
    continueButton: string;
    savedNote: string;
    shopButton: string;
    heartsGained: string;
  };
  recipes: {
    r001: { name: string };
    r002: { name: string };
    r003: { name: string };
    r004: { name: string };
    r005: { name: string };
    r006: { name: string };
    r007: { name: string };
    r008: { name: string };
  };
  ingredients: Record<
    | 'water'
    | 'milk'
    | 'oat_milk'
    | 'coffee'
    | 'tea_leaves'
    | 'honey'
    | 'moonleaf'
    | 'cocoa'
    | 'ember_chili'
    | 'cloud_sugar'
    | 'frostberries'
    | 'ginger_root'
    | 'sage',
    string
  >;
  cast: Record<
    'fenwick' | 'sela' | 'bram' | 'nia' | 'wren',
    CastMember
  >;
  shop: {
    title: string;
    upgradesHeading: string;
    ingredientsHeading: string;
    buyButton: string;
    owned: string;
    priceTemplate: string;
    countTemplate: string;
    insufficientFunds: string;
    unavailable: string;
    shelfFull: string;
    cartClosed: string;
    deliveryNote: string;
    cartNote: string;
    close: string;
  };
  upgrades: {
    items: Record<
      | 'second_kettle'
      | 'bigger_shelf'
      | 'window_bench'
      | 'coffee_machine'
      | 'record_player'
      | 'hearth_expansion',
      UpgradeCopy
    >;
  };
  journal: {
    title: string;
    tabRecipes: string;
    tabRegulars: string;
    tabTown: string;
    tabLetters: string;
    knownCard: string;
    riddleCard: string;
    heartsLabel: string;
    favoriteKnownTemplate: string;
    favoriteUnknown: string;
    newEntryToast: string;
    townSketch: string;
    loreScraps: string[];
  };
  letters: Record<string, LetterEntry>;
  shelf: {
    title: string;
    stockTemplate: string;
  };
  saveio: {
    exportTitle: string;
    importTitle: string;
    exportButton: string;
    copyButton: string;
    copied: string;
    howToUse: string;
    howToUseBody: string;
    importPlaceholder: string;
    restoreButton: string;
    previewLine: string;
    confirmReplace: string;
    cancel: string;
    cryptoUnavailable: string;
    importSuccess: string;
    failureNotACode: string;
    failureDamaged: string;
    failureWrongVersion: string;
    failureNewerVersion: string;
    failureSchemaInvalid: string;
  };
  /** M3 scene copy — keyed line tables per character (scene.ts resolves by key). */
  fenwick: { chiliGiftToast: string } & Record<string, SceneSection | string>;
  wren: Record<string, SceneSection>;
  sela: { intro: SceneSection };
  bram: { intro: SceneSection };
  nia: { intro: SceneSection };
  chat: Record<string, string[]>;
}

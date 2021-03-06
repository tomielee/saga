// eslint-disable-next-line

import { has } from "lodash";

// eslint-disable-next-line
import { ComponentCustomProperties } from "vue";

// eslint-disable-next-line
import createPersistedState from "vuex-persistedstate";

import { Store, createStore } from "vuex";
import { IGameConfig, StationID, Station } from "../station";
import { loadGameConfigAndStations } from "../station";
import { log } from "../utils";

// type stationVisitCount = {
//   stationId: StationID;
//   status: "open" | "closed";
//   count: number;
// };

interface IUserState {
  QRScannerCanBeDisplayed: boolean;
  QRScannerIsDisplayed: boolean;
  showQRScanner: boolean;
  stationsVisited: StationID[];
  stationVisitCounts: Record<StationID, { open: number; closed: number }>;
  lastStationVisitedId?: StationID;
  timers: Record<string, number>;
  helpAvailable: number;
  currentStation: StationID | undefined;
  openStations: StationID[];
  playedHelpTracks: Record<StationID, string[]>;

  // eslint-disable-next-line
  adHocData: Record<string, any>;
}

export interface IState {
  gameConfigLoaded: boolean;
  gameConfig?: IGameConfig;
  displayDevBox: boolean;
  user: IUserState;
  audio: {
    volume: number;
    foreground: {
      isPlaying: boolean;
      data: string | null;
    };
    background: {
      isPlaying: boolean;
      data: string | null;
    };
  };
}

// This is a trick to get the store to work with TypeScript
declare module "@vue/runtime-core" {
  // declare your own store states

  // provide typings for `this.$store`
  interface ComponentCustomProperties {
    $store: Store<IState>;
  }
}

const initialState: IState = {
  gameConfigLoaded: false,
  gameConfig: undefined,
  displayDevBox: true,

  user: {
    QRScannerCanBeDisplayed: false,
    QRScannerIsDisplayed: false,
    showQRScanner: true,
    stationsVisited: [],
    stationVisitCounts: {} as Record<
      StationID,
      { open: number; closed: number }
    >,
    //     tags: [],
    timers: {},
    // onLevel: 0,
    helpAvailable: 3,
    currentStation: undefined,
    openStations: [],
    playedHelpTracks: {} as Record<StationID, string[]>,
    // eslint-disable-next-line
    adHocData: {} as Record<string, any>,
  },
  audio: {
    volume: 0,
    foreground: {
      isPlaying: false,
      // data: {},
      data: null,
    },
    background: {
      isPlaying: false,
      // data: {},
      data: null,
    },
  },
};

export const store = createStore({
  state: initialState,
  mutations: {
    decreaseHelpAvailable(state: IState) {
      state.user.helpAvailable--;
    },

    displayQRScanner(state: IState) {
      state.user.QRScannerIsDisplayed = true;
    },

    hideQRScanner(state: IState) {
      state.user.QRScannerIsDisplayed = false;
    },

    displayButtonToOpenQRScanner(state: IState) {
      state.user.QRScannerCanBeDisplayed = true;
    },

    hideButtonToOpenQRScanner(state: IState) {
      state.user.QRScannerCanBeDisplayed = false;
    },

    pushStationIdToStationsVisited(state: IState, stationId: StationID) {
      const status = state.user.openStations.includes(stationId)
        ? "open"
        : "closed";

      // Only push to stationsVisisited if the current station is "open".
      // i.e. scanning a closed station dosen't count as a regular visit.
      if (status === "open") {
        state.user.stationsVisited.push(stationId);
      }

      // But we want to keep track of the times closed stations have been scanned as well
      // because that's have we decide what help file to play

      // Get the station visit count
      let stationVisitCountEntry = state.user.stationVisitCounts[stationId];

      // Add to the state if doesn't exist
      if (!stationVisitCountEntry) {
        stationVisitCountEntry = { open: 0, closed: 0 };
        state.user.stationVisitCounts[stationId] = stationVisitCountEntry;
      }

      // Bump the count
      stationVisitCountEntry[status]++;
    },

    addTimer(state: IState, payLoad: { timerName: string; timer: number }) {
      state.user.timers[payLoad.timerName] = payLoad.timer;
    },

    removeTimer(state: IState, timerName: string) {
      delete state.user.timers[timerName];
    },

    setForegroundAudioIsPlaying(state: IState, value: boolean) {
      state.audio.foreground.isPlaying = value;
    },

    setAudioBackgroundIsPlaying(state: IState, value: boolean) {
      state.audio.background.isPlaying = value;
    },

    async loadGameConfig(state: IState) {
      const urlParams = new URLSearchParams(window.location.search);
      const configUrl = urlParams.get("configUrl");

      state.displayDevBox = urlParams.get("displayDevBox") == "yes";

      if (configUrl) {
        state.gameConfig = await loadGameConfigAndStations(new URL(configUrl));
        // const loadedGameConfig = await loadGameConfigAndStations(new URL(configUrl));

        state.user.openStations = state.gameConfig.openStationsAtStart;

        state.gameConfigLoaded = true;
        log("store", "gameConfigLoaded");
      }
    },

    wipeHistory(state: IState) {
      state.user = initialState.user;
      state.audio = initialState.audio;
    },

    setCurrentStation(state: IState, stationId: StationID) {
      state.user.currentStation = stationId;
    },

    updateOpenStations(state: IState, stationIds: StationID[]) {
      state.user.openStations = stationIds;
    },

    pushPlayedHelpTrack(
      state: IState,
      payload: { audioFilename: string; currentStation: Station }
    ) {
      if (!has(state.user.playedHelpTracks, payload.currentStation.id)) {
        state.user.playedHelpTracks[payload.currentStation.id] = [];
      }

      state.user.playedHelpTracks[payload.currentStation.id].push(
        payload.audioFilename
      );
    },

    // eslint-disable-next-line
    setAdHocData(state: IState, payload: { key: string; value: any }) {
      state.user.adHocData[payload.key] = payload.value;
    },

    pushToAdHocArray(state: IState, payload: { key: string; value: any }) {
      if (state.user.adHocData[payload.key] === undefined) {
        state.user.adHocData[payload.key] = [];
      }
      state.user.adHocData[payload.key].push(payload.value);
    },
  },
  actions: {},
  modules: {},
  // TODO reinstate
  // plugins: [createPersistedState()],
});

// const storeClosure = store;
// store.subscribe((mutation, state: IState) => {
store.subscribe((_, state: IState) => {
  const timersExists = Object.keys(state.user.timers).length !== 0;

  const audioIsPlaying = state.audio.foreground.isPlaying;
  const qrScannerVisible = state.user.QRScannerIsDisplayed;
  const openQrScannerButtonVisible = state.user.QRScannerCanBeDisplayed;

  if (
    !timersExists &&
    !audioIsPlaying &&
    !qrScannerVisible &&
    !openQrScannerButtonVisible
  ) {
    store.commit(Mutations.displayButtonToOpenQRScanner);
  }

  if (timersExists || audioIsPlaying) {
    // Hide qrScanner and button to open qrScanner
    if (state.user.QRScannerIsDisplayed) {
      store.commit(Mutations.hideQRScanner);
    }
    if (state.user.QRScannerCanBeDisplayed) {
      store.commit(Mutations.hideButtonToOpenQRScanner);
    }
  }
});

// We use an enum for our commits to bring some semblance of
// sanity to this stringly typed API
//
// TODO There are better ways of doing this
// https://dev.to/3vilarthas/vuex-typescript-m4j
export enum Mutations {
  decreaseHelpAvailable = "decreaseHelpAvailable",
  displayQRScanner = "displayQRScanner",
  hideQRScanner = "hideQRScanner",
  displayButtonToOpenQRScanner = "displayButtonToOpenQRScanner",
  hideButtonToOpenQRScanner = "hideButtonToOpenQRScanner",
  wipeHistory = "wipeHistory",
  loadGameConfig = "loadGameConfig",
  pushStationIdToStationsVisited = "pushStationIdToStationsVisited",
  addTimer = "addTimer",
  removeTimer = "removeTimer",
  setForegroundAudioIsPlaying = "setForegroundAudioIsPlaying",
  setAudioBackgroundIsPlaying = "setAudioBackgroundIsPlaying",
  setCurrentStation = "setCurrentStation",
  updateOpenStations = "updateOpenStations",
  pushPlayedHelpTrack = "pushPlayedHelpTrack",
  setAdHocData = "setAdHocData",
  pushToAdHocArray = "pushToAdHocArray",
}

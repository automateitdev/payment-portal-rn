import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./feature/authSlice";
import themeReducer from "./feature/themeSlice";
import { Platform } from "react-native";

// Web storage safely imported
const storage =
  Platform.OS === "web"
    ? require("redux-persist/lib/storage").default
    : null;

import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import { baseApi } from "./baseApi/baseApi";
import secureStorage from "./feature/secureStorate";

const storageEngine = Platform.OS === "web" ? storage : secureStorage;

const authPersistConfig = {
  key: "auth",
  storage: storageEngine,
  whitelist: ["token", "user"],
};


const themePersistConfig = {
  key: "theme",
  storage: storageEngine,
};


const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);
const persistedThemeReducer = persistReducer(themePersistConfig, themeReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    theme: persistedThemeReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const persistor = persistStore(store);

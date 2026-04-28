import * as SecureStore from "expo-secure-store";

const sanitizeKey = (key: string) => key.replace(/[^a-zA-Z0-9._-]/g, "_");

const secureStorage = {
  setItem: async (key: string, value: string) => {
    const safeKey = sanitizeKey(key);

    await SecureStore.setItemAsync(safeKey, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });

    return value;
  },

  getItem: async (key: string) => {
    const safeKey = sanitizeKey(key);
    return await SecureStore.getItemAsync(safeKey);
  },

  removeItem: async (key: string) => {
    const safeKey = sanitizeKey(key);
    await SecureStore.deleteItemAsync(safeKey);
  },
};

export default secureStorage;



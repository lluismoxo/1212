import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Almacenamiento de tokens: SecureStore en nativo, localStorage en web
// (SecureStore no existe en web). Misma interfaz async.
export const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try { globalThis.localStorage?.setItem(key, value); } catch {}
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async del(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try { globalThis.localStorage?.removeItem(key); } catch {}
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

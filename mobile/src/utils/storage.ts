import AsyncStorage from '@react-native-async-storage/async-storage';

/** Store a JSON value */
export async function storeData<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/** Read a JSON value */
export async function readData<T>(key: string): Promise<T | null> {
  const json = await AsyncStorage.getItem(key);
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/** Remove a key */
export async function removeData(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

/** Remove multiple keys */
export async function clearData(keys: string[]): Promise<void> {
  await AsyncStorage.multiRemove(keys);
}

import { Linking, Platform } from "react-native";
import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

// Estados normalizados (cubre concedido/rechazado/limitado/no-determinado).
export type PermState = "granted" | "denied" | "limited" | "undetermined";

function norm(status: string, accessPrivileges?: string): PermState {
  if (status === "granted") {
    return accessPrivileges === "limited" ? "limited" : "granted";
  }
  if (status === "undetermined") return "undetermined";
  return "denied";
}

// Principio de mínimo acceso + solicitud contextual: solo se llama
// cuando el usuario realiza la acción que la necesita.

export async function requestCamera(): Promise<PermState> {
  const res = await Camera.requestCameraPermissionsAsync();
  return norm(res.status);
}

export async function requestPhotos(): Promise<PermState> {
  const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
  // iOS puede conceder acceso limitado (solo fotos seleccionadas).
  return norm(res.status, (res as any).accessPrivileges);
}

// La ubicación será PÚBLICA: el consentimiento debe explicarlo antes de llamar.
export async function requestLocation(): Promise<PermState> {
  const res = await Location.requestForegroundPermissionsAsync();
  return norm(res.status);
}

export async function getLocationState(): Promise<PermState> {
  const res = await Location.getForegroundPermissionsAsync();
  return norm(res.status);
}

// Si el usuario rechazó, guiarlo a Ajustes del sistema (no se puede re-preguntar).
export async function openSystemSettings() {
  if (Platform.OS === "ios") {
    await Linking.openURL("app-settings:");
  } else {
    await Linking.openSettings();
  }
}

// Obtiene la posición actual (tras consentimiento) para enviarla a la API.
export async function getCurrentCoords() {
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM: pos.coords.accuracy ?? null };
}

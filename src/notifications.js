import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../client";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
export async function enablePush(uid) {
  if (!Device.isDevice)
    throw Error(
      "Push notification perlu perangkat fisik dan development build.",
    );
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;
  if (!projectId)
    throw Error(
      "Project EAS belum dikonfigurasi untuk push perangkat. Hubungi pengelola aplikasi.",
    );
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("praktikum", {
      name: "Kegiatan praktikum",
      importance: Notifications.AndroidImportance.HIGH,
    });
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted")
    throw Error(
      "Izin notifikasi ditolak. Aktifkan melalui pengaturan perangkat.",
    );
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const id = encodeURIComponent(token);
  await setDoc(doc(db, "profiles", uid, "devices", id), {
    platform: "expo",
    token,
    updated: serverTimestamp(),
  });
  await AsyncStorage.setItem("push-device:" + uid, id);
}
export async function disablePush(uid) {
  const id = await AsyncStorage.getItem("push-device:" + uid);
  if (id) await deleteDoc(doc(db, "profiles", uid, "devices", id));
  await AsyncStorage.removeItem("push-device:" + uid);
}

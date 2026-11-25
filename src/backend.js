import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../client";
export async function callBackend(name, data) {
  const base = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (!base || process.env.EXPO_PUBLIC_DEMO === "1")
    return (await httpsCallable(functions, name)(data)).data;
  if (!auth.currentUser) throw Error("Silakan masuk kembali.");
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 30000);
  try {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(base.replace(/\/$/, "") + "/" + name, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    const result = await res.json();
    if (!res.ok || result.error) {
      const e = Error(result.error?.message || "Layanan tidak tersedia.");
      e.code = result.error?.code;
      throw e;
    }
    return result.result;
  } catch (e) {
    if (e.name === "AbortError" || e instanceof TypeError)
      throw Error(
        "Backend belum terhubung. Pastikan server laptop menyala dan koneksi tersedia; periksa catatan sebelum mencoba lagi.",
      );
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

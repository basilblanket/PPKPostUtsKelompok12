import * as Location from "expo-location";
export function point(result) {
  return {
    ...result.coords,
    timestamp: result.timestamp,
    mocked: result.mocked === true,
  };
}
export async function permission() {
  const p = await Location.requestForegroundPermissionsAsync();
  if (p.status !== "granted")
    throw Error(
      "Izin lokasi ditolak. Aktifkan izin lokasi melalui pengaturan perangkat/browser.",
    );
  if (!(await Location.hasServicesEnabledAsync()))
    throw Error("Layanan lokasi tidak aktif. Aktifkan GPS/lokasi perangkat.");
}
export async function locate() {
  await permission();
  let timer;
  try {
    return point(
      await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                Error("Lokasi belum diperoleh. Periksa GPS dan coba lagi."),
              ),
            20000,
          );
        }),
      ]),
    );
  } finally {
    clearTimeout(timer);
  }
}
export function distance(a, b) {
  const r = Math.PI / 180,
    h =
      Math.sin(((b.latitude - a.latitude) * r) / 2) ** 2 +
      Math.cos(a.latitude * r) *
        Math.cos(b.latitude * r) *
        Math.sin(((b.longitude - a.longitude) * r) / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export async function watch(next, error) {
  await permission();
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 3,
      timeInterval: 5000,
    },
    (p) => next(point(p)),
    error,
  );
}

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Alert,
  Linking,
  Platform,
  useWindowDimensions,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from "react-native";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  query,
  where,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import * as Location from "expo-location";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { auth, db, configured } from "./client";

let MapView = null,
  Marker = null,
  Circle = null;
if (Platform.OS !== "web") {
  try {
    const Maps = require("react-native-maps");
    MapView = Maps.default || Maps;
    Marker = Maps.Marker;
    Circle = Maps.Circle;
  } catch {}
}

const DEFAULT_REGION = {
  latitude: -7.0493,
  longitude: 110.4401,
  latitudeDelta: 0.004,
  longitudeDelta: 0.004,
};

// Deteksi Expo Go di Android (SDK 53+ menghapus remote push di Expo Go)
const isExpoGoAndroid =
  Platform.OS === "android" &&
  (Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === "storeClient");

function getNotificationsModule() {
  if (Platform.OS === "web" || isExpoGoAndroid) return null;
  try {
    const mod = require("expo-notifications");
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    return mod;
  } catch {
    return null;
  }
}

const ink = "#172f32",
  teal = "#096557",
  muted = "#51696b",
  border = "#d4e1dc";

const S = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#f2f5f1",
    paddingTop: StatusBar.currentHeight || 0,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
    width: "100%",
    maxWidth: 940,
    alignSelf: "center",
    paddingBottom: 64,
  },
  brand: { fontWeight: "700", fontSize: 12, letterSpacing: 1.5, color: teal },
  title: { fontWeight: "800", fontSize: 30, color: ink, letterSpacing: -1 },
  card: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: "#fff",
    gap: 16,
    borderWidth: 1,
    borderColor: border,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  small: { color: muted, fontSize: 14, lineHeight: 21 },
  input: {
    borderWidth: 1,
    borderColor: "#acbfba",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: ink,
    backgroundColor: "#fbfcfa",
  },
  hero: {
    overflow: "hidden",
    padding: 26,
    borderRadius: 22,
    backgroundColor: "#104940",
    gap: 10,
  },
  heroTitle: {
    fontWeight: "800",
    fontSize: 33,
    color: "#fff",
    letterSpacing: -1,
  },
  heroSub: { color: "#d5eae2", fontSize: 15, lineHeight: 23 },
});

// ==================== KOMPONEN UI ====================
function Btn({ title, onPress, tone = "primary", disabled = false }) {
  const quiet = tone === "quiet",
    danger = tone === "danger";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: quiet
          ? "transparent"
          : disabled
            ? "#cfd8d5"
            : danger
              ? "#fff2ee"
              : teal,
        borderRadius: 10,
        minHeight: 42,
        paddingHorizontal: quiet ? 4 : 17,
        paddingVertical: 10,
        alignSelf: quiet ? "flex-start" : "stretch",
        justifyContent: "center",
        alignItems: "center",
        opacity: pressed && !disabled ? 0.72 : 1,
      })}
    >
      <Text
        style={{
          fontWeight: "700",
          fontSize: 15,
          color: quiet
            ? disabled
              ? muted
              : teal
            : disabled
              ? "#617370"
              : danger
                ? "#963b31"
                : "white",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function Input({ label, ...props }) {
  const [focused, setFocus] = useState(false);
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: ink }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        placeholderTextColor="#718482"
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={[
          S.input,
          focused && { borderColor: teal },
          props.multiline && { minHeight: 96, textAlignVertical: "top" },
        ]}
        {...props}
      />
    </View>
  );
}

function Card({ children, style }) {
  return <View style={[S.card, style]}>{children}</View>;
}

function Badge({ value }) {
  const colors = {
    terbuka: ["#d6f1df", "#195a39"],
    diterima: ["#d6f1df", "#195a39"],
    hadir: ["#d6f1df", "#195a39"],
    menunggu: ["#fff2ca", "#77570a"],
    terjadwal: ["#e2eff7", "#1c5475"],
    ditolak: ["#ffebe7", "#873c35"],
    ditutup: ["#e8eeed", "#405955"],
  };
  const [bg, fg] = colors[value] || ["#e8eeed", "#405955"];
  const text = String(value || "");
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: bg,
        borderRadius: 20,
        paddingHorizontal: 11,
        paddingVertical: 5,
      }}
    >
      <Text style={{ color: fg, fontSize: 12, fontWeight: "700" }}>
        {text.charAt(0).toUpperCase() + text.slice(1)}
      </Text>
    </View>
  );
}

function Banner({ title, detail, tag }) {
  return (
    <View style={S.hero}>
      {tag && (
        <Text
          style={{
            color: "#c0e398",
            fontWeight: "700",
            letterSpacing: 1.3,
            fontSize: 12,
          }}
        >
          {tag}
        </Text>
      )}
      <Text accessibilityRole="header" style={S.heroTitle}>
        {title}
      </Text>
      {detail && <Text style={S.heroSub}>{detail}</Text>}
    </View>
  );
}

function Entry({ title, detail, status, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        S.card,
        S.row,
        { padding: 18, backgroundColor: pressed ? "#eff7ef" : "white" },
      ]}
    >
      <View
        style={{ backgroundColor: "#e6f0dd", borderRadius: 12, padding: 11 }}
      >
        <Text style={{ color: teal, fontSize: 20, fontWeight: "700" }}>
          {status ? "◷" : "▦"}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ fontSize: 18, color: ink, fontWeight: "700" }}>
          {title}
        </Text>
        <Text style={S.small}>{detail}</Text>
        {status && <Badge value={status} />}
      </View>
      <Text style={{ color: teal, fontSize: 24 }}>›</Text>
    </Pressable>
  );
}

function Fold({ title, children, defaultOpen = false }) {
  const [open, set] = useState(defaultOpen);
  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={S.row}
        onPress={() => set(!open)}
      >
        <Text style={{ flex: 1, fontWeight: "700", color: ink, fontSize: 17 }}>
          {title}
        </Text>
        <Text style={{ color: teal, fontSize: 21 }}>{open ? "−" : "+"}</Text>
      </Pressable>
      {open && children}
    </Card>
  );
}

function Note({ children, tone = "neutral" }) {
  const bg =
    tone === "danger"
      ? "#ffebe7"
      : tone === "warn"
        ? "#fff2ca"
        : tone === "ok"
          ? "#d6f1df"
          : "#e7efea";
  const fg =
    tone === "danger"
      ? "#873c35"
      : tone === "warn"
        ? "#77570a"
        : tone === "ok"
          ? "#195a39"
          : muted;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 12, padding: 14 }}>
      <Text style={[S.small, { color: fg }]}>{children}</Text>
    </View>
  );
}

function LoginArt() {
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        height: 114,
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        gap: 6,
      }}
    >
      {[26, 48, 72, 96, 110, 96, 72, 48, 26].map((h, i) => (
        <View
          key={i}
          style={{
            width: 19,
            height: h,
            borderRadius: 10,
            backgroundColor: ["#86b9a5", "#bfe997", "#ecf5cf"][i % 3],
            transform: [{ rotate: "24deg" }],
          }}
        />
      ))}
    </View>
  );
}

// ==================== HELPER DATA & FIRESTORE ====================
function act(fn) {
  return async () => {
    try {
      await fn();
    } catch (e) {
      const codes = {
        "auth/invalid-credential": "Email atau kata sandi salah.",
        "auth/email-already-in-use": "Email sudah terdaftar.",
        "permission-denied": "Akses ditolak atau status data sudah berubah.",
        "auth/network-request-failed": "Gagal terhubung. Periksa koneksi.",
      };
      if (typeof document !== "undefined")
        return window.alert(codes[e.code] || e.message);
      Alert.alert("Tidak dapat menyimpan", codes[e.code] || e.message);
    }
  };
}

function confirm(title, fn) {
  if (typeof document !== "undefined") {
    if (window.confirm(title)) act(fn)();
    return;
  }
  Alert.alert(title, "Perubahan berlaku bagi peserta kelas.", [
    { text: "Batal", style: "cancel" },
    { text: "Lanjutkan", onPress: act(fn) },
  ]);
}

function required(v, n) {
  if (!String(v || "").trim() || String(v).trim().length > n)
    throw Error("Isi teks 1–" + n + " karakter.");
  return String(v).trim();
}

function useLive(ref, key, single = false) {
  const [state, put] = useState({});
  useEffect(() => {
    if (!key) return;
    let active = true;
    const off = onSnapshot(
      ref(),
      { includeMetadataChanges: true },
      (snap) => {
        if (active)
          put({
            key,
            data: single
              ? snap.exists()
                ? { ...snap.data(), id: snap.id }
                : null
              : snap.docs.map((d) => ({
                  ...d.data(),
                  id: d.id,
                  parentId: d.ref.parent.parent?.id,
                })),
            cache: snap.metadata.fromCache,
            pending: snap.metadata.hasPendingWrites,
          });
      },
      (e) => active && put({ key, error: e.message }),
    );
    return () => {
      active = false;
      off();
    };
  }, [key]);
  return state.key === key ? state : {};
}

function Live({ v, children }) {
  if (v.error)
    return <Text accessibilityRole="alert">Gagal memuat: {v.error}</Text>;
  if (v.data === undefined) return <Text>Memuat data…</Text>;
  return (
    <>
      {v.pending ? (
        <Text style={S.small}>Mengirim perubahan…</Text>
      ) : v.cache ? (
        <Text style={S.small}>Menunggu koneksi ke server…</Text>
      ) : null}
      {children}
    </>
  );
}

const fmt = (t) =>
  t?.toDate ? t.toDate().toLocaleString("id-ID") : "Menunggu server";

function local(t) {
  const d = t.toDate();
  return new Date(+d - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
}

// ==================== GEOLOCATION & VALIDASI RADIUS ====================
function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function useDeviceLocation(watch = true) {
  const [state, setState] = useState({
    status: "checking",
    coords: null,
    error: "",
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "checking", error: "" }));
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setState({
          status: "disabled",
          coords: null,
          error:
            "Layanan lokasi (GPS) perangkat tidak aktif. Aktifkan GPS lalu coba lagi.",
        });
        return;
      }

      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        setState({
          status: "denied",
          coords: null,
          error:
            "Izin akses lokasi ditolak. Buka pengaturan aplikasi untuk mengizinkan akses lokasi.",
        });
        return;
      }

      let loc = null;
      try {
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
      } catch {
        loc = await Location.getLastKnownPositionAsync();
      }

      if (!loc?.coords) {
        setState({
          status: "unavailable",
          coords: null,
          error:
            "Koordinat lokasi belum tersedia. Pastikan sinyal GPS terbuka lalu muat ulang.",
        });
        return;
      }

      setState({
        status: "ready",
        coords: {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: Math.round(loc.coords.accuracy || 0),
        },
        error: "",
      });
    } catch (e) {
      setState({
        status: "unavailable",
        coords: null,
        error: "Gagal memperoleh lokasi: " + (e?.message || "kesalahan perangkat"),
      });
    }
  }, []);

  useEffect(() => {
    let sub = null,
      active = true;
    (async () => {
      await refresh();
      if (!watch || !active) return;
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== "granted") return;
      try {
        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 2,
          },
          (loc) => {
            if (!active || !loc?.coords) return;
            setState({
              status: "ready",
              coords: {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                accuracy: Math.round(loc.coords.accuracy || 0),
              },
              error: "",
            });
          },
        );
      } catch {}
    })();
    return () => {
      active = false;
      if (sub) sub.remove();
    };
  }, [watch, refresh]);

  return { ...state, refresh };
}

function checkAttendanceEligibility({
  session,
  lab,
  locationState,
  existingRecord,
}) {
  if (!session)
    return { ok: false, reason: "Pilih sesi praktikum terlebih dahulu." };
  if (existingRecord) {
    return {
      ok: false,
      reason:
        existingRecord.kind === "hadir"
          ? "Anda sudah tercatat hadir pada sesi ini."
          : "Anda sudah mengajukan izin pada sesi ini.",
    };
  }
  if (session.status !== "terbuka") {
    return {
      ok: false,
      reason: "Sesi belum dibuka atau sudah ditutup oleh asisten.",
    };
  }
  if (
    !lab ||
    typeof lab.latitude !== "number" ||
    typeof lab.longitude !== "number"
  ) {
    return {
      ok: false,
      reason: "Lokasi laboratorium untuk sesi ini belum diatur oleh asisten.",
    };
  }
  if (locationState.status !== "ready" || !locationState.coords) {
    return {
      ok: false,
      reason: locationState.error || "Menunggu koordinat GPS perangkat…",
    };
  }

  const maxRadius = Number(session.radius || lab.radius || 50);
  const distance = haversineMeters(
    locationState.coords.latitude,
    locationState.coords.longitude,
    lab.latitude,
    lab.longitude,
  );

  if (distance > maxRadius) {
    return {
      ok: false,
      distance,
      maxRadius,
      reason: `Di luar radius laboratorium (${distance} m dari ${lab.name}, batas maksimal ${maxRadius} m).`,
    };
  }

  return {
    ok: true,
    distance,
    maxRadius,
    reason: `Lokasi valid (${distance} m dari ${lab.name}, batas ${maxRadius} m).`,
  };
}

// ==================== PUSH NOTIFICATIONS ====================
async function setupNotifications(uid) {
  if (!uid) return { status: "idle", message: "" };

  if (isExpoGoAndroid) {
    return {
      status: "expo-go",
      message:
        "Mode Expo Go: pemberitahuan berjalan real-time langsung di dalam aplikasi.",
    };
  }

  const Notifications = getNotificationsModule();
  if (!Notifications || !Device.isDevice) {
    return {
      status: "unsupported",
      message:
        "Push notification background aktif pada perangkat fisik dengan Development Build.",
    };
  }

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("praktikum-updates", {
        name: "Pembaruan Praktikum",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#096557",
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;
    if (finalStatus !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      finalStatus = req.status;
    }

    if (finalStatus !== "granted") {
      return {
        status: "denied",
        message:
          "Izin notifikasi ditolak. Aktifkan notifikasi di pengaturan perangkat agar tidak tertinggal info sesi & izin.",
      };
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    const tokenRes = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    if (tokenRes?.data) {
      await setDoc(
        doc(db, "profiles", uid),
        { expoPushToken: tokenRes.data, pushUpdatedAt: serverTimestamp() },
        { merge: true },
      );
    }

    return { status: "granted", message: "Notifikasi native aktif." };
  } catch (e) {
    return {
      status: "error",
      message:
        "Notifikasi gagal diinisialisasi (" +
        (e?.message || "periksa koneksi") +
        ").",
    };
  }
}

async function notifyUsers({ uids = [], title, body, data = {} }) {
  const uniqueUids = [...new Set((uids || []).filter(Boolean))];
  if (!uniqueUids.length) return;

  try {
    const snaps = await Promise.all(
      uniqueUids.map((uid) => getDoc(doc(db, "profiles", uid))),
    );
    const messages = [];
    snaps.forEach((snap) => {
      if (!snap.exists()) return;
      const token = snap.data()?.expoPushToken;
      if (token && String(token).startsWith("ExponentPushToken")) {
        messages.push({
          to: token,
          sound: "default",
          channelId: "praktikum-updates",
          title,
          body,
          data,
        });
      }
    });

    // Simpan ke Firestore agar memicu notifikasi real-time di Expo Go maupun log riwayat
    await addDoc(collection(db, "notifications"), {
      recipients: uniqueUids,
      title,
      body,
      data,
      sentCount: messages.length,
      createdAt: serverTimestamp(),
    });

    if (messages.length > 0) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });
    }
  } catch {}
}

// ==================== HALAMAN PRESENSI (SPRINT 3) ====================
function AttendanceScreen({ u, name, initialTarget = null, onClearTarget }) {
  const [selected, setSelected] = useState(initialTarget);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialTarget) setSelected(initialTarget);
  }, [initialTarget]);

  const loc = useDeviceLocation(true);
  const labsState = useLive(() => collection(db, "labs"), "all-labs");
  const classesState = useLive(
    () =>
      query(
        collection(db, "classes"),
        where("members", "array-contains", u.uid),
      ),
    "student-classes-" + u.uid,
  );
  const sessionsState = useLive(
    () => collectionGroup(db, "sessions"),
    "all-sessions-attendance",
  );

  const labMap = Object.fromEntries(
    (labsState.data || []).map((l) => [l.id, l]),
  );
  const activeClasses = (classesState.data || []).filter((c) => !c.archived);
  const classMap = Object.fromEntries(activeClasses.map((c) => [c.id, c]));

  const mySessions = (sessionsState.data || [])
    .map((s) => ({ ...s, classId: s.classId || s.parentId }))
    .filter((s) => s.status !== "diarsipkan" && s.classId && classMap[s.classId])
    .sort((a, b) => {
      if (a.status === "terbuka" && b.status !== "terbuka") return -1;
      if (a.status !== "terbuka" && b.status === "terbuka") return 1;
      return (a.at?.toMillis?.() || 0) - (b.at?.toMillis?.() || 0);
    });

  const activeSession = selected
    ? mySessions.find(
        (s) => s.id === selected.sessionId && s.classId === selected.classId,
      ) || null
    : mySessions[0] || null;

  const recordKey = activeSession
    ? `rec-${activeSession.classId}-${activeSession.id}-${u.uid}`
    : null;
  const recordState = useLive(
    () =>
      doc(
        db,
        "classes",
        activeSession.classId,
        "sessions",
        activeSession.id,
        "records",
        u.uid,
      ),
    recordKey,
    true,
  );

  const targetLab = activeSession?.labId ? labMap[activeSession.labId] : null;
  const eligibility = checkAttendanceEligibility({
    session: activeSession,
    lab: targetLab,
    locationState: loc,
    existingRecord: recordState.data,
  });

  const handleAttend = act(async () => {
    if (!activeSession || submitting) return;
    setSubmitting(true);
    try {
      const check = checkAttendanceEligibility({
        session: activeSession,
        lab: targetLab,
        locationState: loc,
        existingRecord: recordState.data,
      });
      if (!check.ok) throw Error(check.reason);

      const recordRef = doc(
        db,
        "classes",
        activeSession.classId,
        "sessions",
        activeSession.id,
        "records",
        u.uid,
      );
      const snap = await getDoc(recordRef);
      if (snap.exists())
        throw Error(
          "Anda sudah tercatat pada sesi ini (presensi ganda ditolak).",
        );

      await setDoc(recordRef, {
        kind: "hadir",
        name,
        created: serverTimestamp(),
        location: {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
          distance: check.distance,
          maxRadius: check.maxRadius,
          labId: targetLab.id,
          labName: targetLab.name,
        },
      });
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <>
      <Banner
        tag="PRESENSI LOKASI"
        title="Halaman Presensi"
        detail="Validasi koordinat perangkat terhadap radius laboratorium."
      />

      <Card>
        <View style={[S.row, { justifyContent: "space-between" }]}>
          <Text style={S.brand}>STATUS LOKASI PERANGKAT</Text>
          <Btn tone="quiet" title="Muat Ulang GPS" onPress={loc.refresh} />
        </View>
        {loc.status === "ready" && loc.coords ? (
          <Note tone="ok">
            GPS Aktif · {loc.coords.latitude.toFixed(6)},{" "}
            {loc.coords.longitude.toFixed(6)} (Akurasi ±{loc.coords.accuracy} m)
          </Note>
        ) : (
          <>
            <Note tone={loc.status === "checking" ? "neutral" : "danger"}>
              {loc.status === "checking"
                ? "Mengunci koordinat GPS perangkat…"
                : loc.error}
            </Note>
            {(loc.status === "denied" || loc.status === "disabled") &&
              Platform.OS !== "web" && (
                <Btn
                  tone="quiet"
                  title="Buka Pengaturan Perangkat"
                  onPress={() => Linking.openSettings()}
                />
              )}
          </>
        )}
      </Card>

      <Live v={sessionsState}>
        {activeSession ? (
          <Card>
            <View style={[S.row, { justifyContent: "space-between" }]}>
              <Text style={S.brand}>
                {classMap[activeSession.classId]?.title || "KELAS PRAKTIKUM"}
              </Text>
              <Badge value={activeSession.status} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: ink }}>
              {activeSession.title}
            </Text>
            <Text style={S.small}>Jadwal: {fmt(activeSession.at)}</Text>
            <Text style={S.small}>
              Lokasi Lab:{" "}
              {targetLab
                ? `${targetLab.name} (${targetLab.building || "Informatika"}) · Radius ${
                    activeSession.radius || targetLab.radius || 50
                  } m`
                : "Belum ditentukan asisten"}
            </Text>

            {typeof eligibility.distance === "number" && (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: eligibility.ok ? teal : "#963b31",
                }}
              >
                Jarak Anda ke Lab: {eligibility.distance} meter
              </Text>
            )}

            <Note tone={eligibility.ok ? "ok" : "warn"}>
              {eligibility.reason}
            </Note>

            {recordState.data ? (
              <Note tone="ok">
                Status Anda:{" "}
                {recordState.data.kind === "hadir"
                  ? `Sudah Hadir (${fmt(recordState.data.created)})`
                  : `Sudah Mengajukan Izin (${recordState.data.decision})`}
              </Note>
            ) : (
              <Btn
                title={
                  submitting
                    ? "Memverifikasi & Menyimpan…"
                    : "Catat Kehadiran Sekarang"
                }
                disabled={!eligibility.ok || submitting}
                onPress={handleAttend}
              />
            )}
          </Card>
        ) : (
          <Note>Belum ada jadwal sesi praktikum pada kelas Anda.</Note>
        )}

        {mySessions.length > 1 && (
          <>
            <Text style={S.brand}>PILIH SESI PRAKTIKUM LAINNYA</Text>
            {mySessions.map((s) => (
              <Entry
                key={`${s.classId}-${s.id}`}
                title={s.title}
                status={s.status}
                detail={`${classMap[s.classId]?.title || "Kelas"} · ${fmt(s.at)}${
                  s.labId && labMap[s.labId] ? " · " + labMap[s.labId].name : ""
                }`}
                onPress={() => {
                  if (onClearTarget) onClearTarget();
                  setSelected({ classId: s.classId, sessionId: s.id });
                }}
              />
            ))}
          </>
        )}
      </Live>
    </>
  );
}

// ==================== HALAMAN PETA LABORATORIUM (SPRINT 3) ====================
function LabMapScreen({ staff }) {
  const loc = useDeviceLocation(true);
  const labsState = useLive(() => collection(db, "labs"), "map-labs");
  const classesState = useLive(() => collection(db, "classes"), "map-classes");
  const sessionsState = useLive(
    () => collectionGroup(db, "sessions"),
    "map-sessions",
  );

  const labs = labsState.data || [];
  const [selectedLabId, setSelectedLabId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [labName, setLabName] = useState("");
  const [building, setBuilding] = useState("");
  const [latStr, setLatStr] = useState("");
  const [lngStr, setLngStr] = useState("");
  const [radiusStr, setRadiusStr] = useState("50");

  const activeLab = labs.find((l) => l.id === selectedLabId) || labs[0] || null;
  const classMap = Object.fromEntries(
    (classesState.data || [])
      .filter((c) => !c.archived)
      .map((c) => [c.id, c]),
  );

  const nowMs = Date.now();
  const labSessions = activeLab
    ? (sessionsState.data || [])
        .map((s) => ({ ...s, classId: s.classId || s.parentId }))
        .filter(
          (s) =>
            s.labId === activeLab.id &&
            s.status !== "diarsipkan" &&
            s.classId &&
            classMap[s.classId],
        )
    : [];

  const ongoingSessions = labSessions
    .filter((s) => s.status === "terbuka")
    .sort((a, b) => (a.at?.toMillis?.() || 0) - (b.at?.toMillis?.() || 0));

  const upcomingSessions = labSessions
    .filter(
      (s) =>
        s.status === "terjadwal" && (s.at?.toMillis?.() || 0) >= nowMs - 3600000,
    )
    .sort((a, b) => (a.at?.toMillis?.() || 0) - (b.at?.toMillis?.() || 0));

  const mapRegion = activeLab
    ? {
        latitude: activeLab.latitude,
        longitude: activeLab.longitude,
        latitudeDelta: 0.0025,
        longitudeDelta: 0.0025,
      }
    : loc.coords
      ? {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.004,
          longitudeDelta: 0.004,
        }
      : DEFAULT_REGION;

  const startEditLab = (lab) => {
    setEditingId(lab.id);
    setLabName(lab.name || "");
    setBuilding(lab.building || "");
    setLatStr(String(lab.latitude ?? ""));
    setLngStr(String(lab.longitude ?? ""));
    setRadiusStr(String(lab.radius ?? 50));
  };

  const resetLabForm = () => {
    setEditingId(null);
    setLabName("");
    setBuilding("");
    setLatStr("");
    setLngStr("");
    setRadiusStr("50");
  };

  const saveLab = act(async () => {
    const cleanName = required(labName, 80);
    const cleanBuilding = building.trim().slice(0, 100);
    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lngStr);
    const radius = parseInt(radiusStr, 10);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
      throw Error("Latitude tidak valid (-90 sampai 90).");
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
      throw Error("Longitude tidak valid (-180 sampai 180).");
    if (!Number.isFinite(radius) || radius < 5 || radius > 1000)
      throw Error("Radius harus antara 5 sampai 1000 meter.");

    const payload = {
      name: cleanName,
      building: cleanBuilding,
      latitude,
      longitude,
      radius,
      updatedAt: serverTimestamp(),
    };

    if (editingId) {
      await updateDoc(doc(db, "labs", editingId), payload);
    } else {
      const created = await addDoc(collection(db, "labs"), payload);
      setSelectedLabId(created.id);
    }
    resetLabForm();
  });

  return (
    <>
      <Banner
        tag="PETA INFORMATIKA"
        title="Laboratorium & Aktivitas"
        detail="Pilih marker laboratorium untuk melihat praktikum berlangsung dan berikutnya."
      />

      {loc.status !== "ready" && (
        <Card>
          <Note tone={loc.status === "checking" ? "neutral" : "warn"}>
            {loc.status === "checking"
              ? "Mendeteksi posisi perangkat Anda pada peta…"
              : loc.error}
          </Note>
          <View style={S.row}>
            <Btn tone="quiet" title="Coba Lagi" onPress={loc.refresh} />
            {(loc.status === "denied" || loc.status === "disabled") &&
              Platform.OS !== "web" && (
                <Btn
                  tone="quiet"
                  title="Buka Pengaturan"
                  onPress={() => Linking.openSettings()}
                />
              )}
          </View>
        </Card>
      )}

      <Live v={labsState}>
        <Card style={{ padding: 12 }}>
          {MapView ? (
            <View
              style={{
                height: 320,
                borderRadius: 14,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: border,
              }}
            >
              <MapView
                style={{ flex: 1 }}
                region={mapRegion}
                showsUserLocation={loc.status === "ready"}
                showsMyLocationButton
              >
                {loc.coords && (
                  <Marker
                    coordinate={loc.coords}
                    title="Posisi Anda"
                    description={`Akurasi ±${loc.coords.accuracy} m`}
                    pinColor="#1c7ed6"
                  />
                )}
                {labs.map((lab) => (
                  <React.Fragment key={lab.id}>
                    <Marker
                      coordinate={{
                        latitude: lab.latitude,
                        longitude: lab.longitude,
                      }}
                      title={lab.name}
                      description={`${lab.building || "Lab Informatika"} · Radius ${lab.radius} m`}
                      pinColor={activeLab?.id === lab.id ? "#096557" : "#d9480f"}
                      onPress={() => setSelectedLabId(lab.id)}
                    />
                    <Circle
                      center={{
                        latitude: lab.latitude,
                        longitude: lab.longitude,
                      }}
                      radius={Number(lab.radius || 50)}
                      strokeColor="rgba(9, 101, 87, 0.7)"
                      fillColor="rgba(9, 101, 87, 0.16)"
                    />
                  </React.Fragment>
                ))}
              </MapView>
            </View>
          ) : (
            <Note>
              Modul peta belum tersedia atau sedang dibuka di Web. Pilih
              laboratorium di bawah untuk melihat aktivitas.
            </Note>
          )}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {labs.map((lab) => (
              <Btn
                key={lab.id}
                tone={activeLab?.id === lab.id ? "primary" : "quiet"}
                title={lab.name}
                onPress={() => setSelectedLabId(lab.id)}
              />
            ))}
          </View>
        </Card>
      </Live>

      {activeLab ? (
        <Card>
          <View style={[S.row, { justifyContent: "space-between" }]}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={S.brand}>
                {activeLab.building || "LABORATORIUM INFORMATIKA"}
              </Text>
              <Text style={{ fontSize: 22, fontWeight: "800", color: ink }}>
                {activeLab.name}
              </Text>
              <Text style={S.small}>
                Koordinat: {activeLab.latitude.toFixed(5)},{" "}
                {activeLab.longitude.toFixed(5)} · Radius {activeLab.radius} m
              </Text>
            </View>
            {staff && (
              <Btn
                tone="quiet"
                title="Edit Lab"
                onPress={() => startEditLab(activeLab)}
              />
            )}
          </View>

          <Text style={S.brand}>SEDANG BERLANGSUNG</Text>
          {ongoingSessions.length ? (
            ongoingSessions.map((s) => (
              <View
                key={s.id}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: "#eff7ef",
                  gap: 6,
                }}
              >
                <View style={[S.row, { justifyContent: "space-between" }]}>
                  <Text style={{ fontWeight: "700", fontSize: 16, color: ink }}>
                    {s.title}
                  </Text>
                  <Badge value={s.status} />
                </View>
                <Text style={S.small}>
                  Kelas: {classMap[s.classId]?.title || "-"}
                </Text>
                <Text style={S.small}>Waktu: {fmt(s.at)}</Text>
              </View>
            ))
          ) : (
            <Note>Tidak ada praktikum yang sedang berlangsung di lab ini.</Note>
          )}

          <Text style={S.brand}>PRAKTIKUM BERIKUTNYA</Text>
          {upcomingSessions.length ? (
            upcomingSessions.map((s) => (
              <View
                key={s.id}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: "#f7faf8",
                  borderWidth: 1,
                  borderColor: border,
                  gap: 6,
                }}
              >
                <View style={[S.row, { justifyContent: "space-between" }]}>
                  <Text style={{ fontWeight: "700", fontSize: 16, color: ink }}>
                    {s.title}
                  </Text>
                  <Badge value={s.status} />
                </View>
                <Text style={S.small}>
                  Kelas: {classMap[s.classId]?.title || "-"}
                </Text>
                <Text style={S.small}>Waktu: {fmt(s.at)}</Text>
              </View>
            ))
          ) : (
            <Note>Belum ada jadwal praktikum berikutnya di lab ini.</Note>
          )}

          {staff && (
            <Btn
              tone="danger"
              title="Hapus Laboratorium"
              onPress={() =>
                confirm("Hapus data laboratorium ini?", () =>
                  deleteDoc(doc(db, "labs", activeLab.id)),
                )
              }
            />
          )}
        </Card>
      ) : (
        <Note>
          Belum ada data laboratorium. Asisten dapat menambahkan lokasi
          laboratorium di bawah.
        </Note>
      )}

      {staff && (
        <Fold
          title={
            editingId
              ? "Edit Lokasi Laboratorium"
              : "Tambah Lokasi Laboratorium"
          }
          defaultOpen={Boolean(editingId) || !labs.length}
        >
          <Input
            label="Nama Laboratorium (mis. Lab Komputer A)"
            value={labName}
            onChangeText={setLabName}
          />
          <Input
            label="Gedung / Keterangan Ruangan"
            placeholder="Gedung E Lantai 2 Informatika"
            value={building}
            onChangeText={setBuilding}
          />
          <Btn
            tone="quiet"
            title="Gunakan Koordinat Lokasi Saya Saat Ini"
            onPress={() => {
              if (!loc.coords) {
                return act(() => {
                  throw Error(
                    loc.error || "Lokasi perangkat belum siap. Muat ulang GPS.",
                  );
                })();
              }
              setLatStr(String(loc.coords.latitude));
              setLngStr(String(loc.coords.longitude));
            }}
          />
          <Input
            label="Latitude"
            keyboardType="numeric"
            placeholder="-7.049300"
            value={latStr}
            onChangeText={setLatStr}
          />
          <Input
            label="Longitude"
            keyboardType="numeric"
            placeholder="110.440100"
            value={lngStr}
            onChangeText={setLngStr}
          />
          <Input
            label="Radius Presensi Default (meter)"
            keyboardType="numeric"
            placeholder="50"
            value={radiusStr}
            onChangeText={setRadiusStr}
          />
          <Btn
            title={editingId ? "Simpan Perubahan Lab" : "Simpan Laboratorium"}
            onPress={saveLab}
          />
          {editingId && (
            <Btn tone="quiet" title="Batal Edit" onPress={resetLabForm} />
          )}
        </Fold>
      )}
    </>
  );
}

// ==================== AUTENTIKASI & KELAS (SPRINT 2 + SPRINT 3) ====================
function Login() {
  const [reg, R] = useState(false),
    [email, E] = useState(""),
    [pass, P] = useState("");
  const wide = useWindowDimensions().width >= 740;
  return (
    <View
      style={{
        flexDirection: wide ? "row" : "column",
        gap: 16,
        marginTop: wide ? 36 : 0,
      }}
    >
      <View
        style={[
          S.hero,
          {
            flex: wide ? 1 : undefined,
            justifyContent: "space-between",
            gap: 18,
          },
        ]}
      >
        <View style={{ gap: 10 }}>
          <Text style={S.heroTitle}>Ruang Praktikum</Text>
          <Text style={S.heroSub}>
            Jadwal, presensi berbasis lokasi, peta lab, dan notifikasi dalam
            satu ruang.
          </Text>
        </View>
        <LoginArt />
      </View>
      <View style={{ flex: wide ? 1 : undefined }}>
        <Card>
          <Text style={S.title}>{reg ? "Buat akun" : "Masuk"}</Text>
          <Input
            label="Email"
            keyboardType="email-address"
            value={email}
            onChangeText={E}
          />
          <Input
            label="Kata sandi"
            secureTextEntry
            value={pass}
            onChangeText={P}
          />
          <Btn
            title={reg ? "Daftar" : "Masuk"}
            onPress={act(async () => {
              if (!email.trim().includes("@") || pass.length < 6)
                throw Error(
                  "Masukkan email dan kata sandi minimal 6 karakter.",
                );
              await (
                reg
                  ? createUserWithEmailAndPassword
                  : signInWithEmailAndPassword
              )(auth, email.trim(), pass);
            })}
          />
          <Btn
            tone="quiet"
            title={reg ? "Sudah punya akun" : "Daftar sebagai praktikan"}
            onPress={() => R(!reg)}
          />
        </Card>
      </View>
    </View>
  );
}

function Account({ u }) {
  const profile = useLive(() => doc(db, "profiles", u.uid), u.uid, true),
    [name, N] = useState(""),
    [role, R] = useState(null),
    [error, E] = useState(""),
    [notifStatus, setNotifStatus] = useState(null),
    [latestNotif, setLatestNotif] = useState(null),
    [tab, setTab] = useState("classes"),
    [attendanceTarget, setAttendanceTarget] = useState(null);

  const seenNotifIds = useRef(null);

  useEffect(() => {
    u.getIdTokenResult()
      .then((r) => R(r.claims.asisten === true))
      .catch((e) => E(e.message));

    setupNotifications(u.uid).then(setNotifStatus);

    // Listener real-time notifikasi untuk akun ini (langsung jalan di Expo Go)
    const qNotif = query(
      collection(db, "notifications"),
      where("recipients", "array-contains", u.uid),
    );
    const unsubNotif = onSnapshot(
      qNotif,
      (snap) => {
        if (seenNotifIds.current === null) {
          seenNotifIds.current = new Set(snap.docs.map((d) => d.id));
          return;
        }
        snap.docChanges().forEach((change) => {
          if (
            change.type === "added" &&
            !seenNotifIds.current.has(change.doc.id)
          ) {
            seenNotifIds.current.add(change.doc.id);
            const item = { id: change.doc.id, ...change.doc.data() };
            setLatestNotif(item);
            if (Platform.OS !== "web") {
              Alert.alert(item.title || "Info Praktikum", item.body || "");
            }
          }
        });
      },
      () => {},
    );

    return () => unsubNotif();
  }, [u]);

  const openAttendancePage = (classId, sessionId) => {
    setAttendanceTarget({ classId, sessionId });
    setTab("attendance");
  };

  return (
    <>
      <View
        style={[S.row, { flexWrap: "wrap", justifyContent: "space-between" }]}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Badge
            value={
              role === null ? "Memuat peran" : role ? "Asisten" : "Praktikan"
            }
          />
          <Text style={S.small}>{u.email}</Text>
        </View>
        <Btn tone="quiet" title="Keluar" onPress={act(() => signOut(auth))} />
      </View>

      {latestNotif && (
        <Card style={{ backgroundColor: "#eff7ef", borderColor: teal }}>
          <View style={[S.row, { justifyContent: "space-between" }]}>
            <Text style={S.brand}>PEMBERITAHUAN BARU</Text>
            <Btn
              tone="quiet"
              title="Tutup"
              onPress={() => setLatestNotif(null)}
            />
          </View>
          <Text style={{ fontWeight: "700", fontSize: 16, color: ink }}>
            {latestNotif.title}
          </Text>
          <Text style={S.small}>{latestNotif.body}</Text>
        </Card>
      )}

      {notifStatus &&
        (notifStatus.status === "denied" || notifStatus.status === "error") && (
          <Note tone="warn">{notifStatus.message}</Note>
        )}
      {notifStatus?.status === "denied" && Platform.OS !== "web" && (
        <Btn
          tone="quiet"
          title="Pengaturan Notifikasi"
          onPress={() => Linking.openSettings()}
        />
      )}

      {error ? <Text>{error}</Text> : null}

      <Live v={profile}>
        {profile.data ? (
          role !== null && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  backgroundColor: "#e4ece8",
                  padding: 6,
                  borderRadius: 14,
                }}
              >
                {[
                  { id: "classes", label: "Kelas" },
                  ...(!role ? [{ id: "attendance", label: "Presensi" }] : []),
                  { id: "map", label: "Peta Lab" },
                ].map((item) => {
                  const active = tab === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setTab(item.id)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        alignItems: "center",
                        backgroundColor: active ? teal : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: "700",
                          fontSize: 14,
                          color: active ? "#fff" : ink,
                        }}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {tab === "classes" && (
                <Home
                  u={u}
                  staff={role}
                  name={profile.data.name}
                  onOpenAttendance={openAttendancePage}
                />
              )}
              {tab === "attendance" && !role && (
                <AttendanceScreen
                  u={u}
                  name={profile.data.name}
                  initialTarget={attendanceTarget}
                  onClearTarget={() => setAttendanceTarget(null)}
                />
              )}
              {tab === "map" && <LabMapScreen staff={role} />}
            </>
          )
        ) : (
          <Card>
            <Input label="Nama lengkap" value={name} onChangeText={N} />
            <Btn
              title="Simpan profil"
              onPress={act(() =>
                setDoc(
                  doc(db, "profiles", u.uid),
                  { name: required(name, 80) },
                  { merge: true },
                ),
              )}
            />
          </Card>
        )}
      </Live>
    </>
  );
}

function Home({ u, staff, name, onOpenAttendance }) {
  const [cid, C] = useState(null),
    [title, T] = useState("");
  const list = useLive(
    () =>
      query(
        collection(db, "classes"),
        staff
          ? where("owner", "==", u.uid)
          : where("members", "array-contains", u.uid),
      ),
    u.uid + staff,
  );
  const rows = (list.data || []).filter((c) => !c.archived),
    selected = rows.find((c) => c.id === cid);
  return (
    <Live v={list}>
      {selected ? (
        <ClassView
          key={cid}
          c={selected}
          {...{ u, staff, name, onOpenAttendance }}
          back={() => C(null)}
        />
      ) : (
        <>
          <Banner
            title="Kelas saya"
            detail={name + "  ·  " + rows.length + " kelas aktif"}
          />
          {!staff && (
            <Fold title="UID untuk bergabung ke kelas">
              <Text selectable style={S.small}>
                {u.uid}
              </Text>
              <Text style={S.small}>Bagikan UID ini kepada asisten.</Text>
            </Fold>
          )}
          {rows.map((c) => (
            <Entry
              key={c.id}
              detail={c.members.length + " peserta"}
              title={c.title}
              onPress={() => C(c.id)}
            />
          ))}
          {!rows.length && <Note>Belum ada kelas.</Note>}
          {staff && (
            <Fold title="Tambah kelas">
              <Input label="Nama kelas baru" value={title} onChangeText={T} />
              <Btn
                title="Tambah kelas"
                onPress={act(async () => {
                  await addDoc(collection(db, "classes"), {
                    title: required(title, 100),
                    owner: u.uid,
                    members: [],
                    archived: false,
                  });
                  T("");
                })}
              />
            </Fold>
          )}
        </>
      )}
    </Live>
  );
}

function ClassView({ c, u, staff, name, back, onOpenAttendance }) {
  const [sid, I] = useState(null),
    [title, T] = useState(c.title),
    [uid, U] = useState("");
  const path = ["classes", c.id],
    ref = doc(db, ...path),
    list = useLive(() => collection(db, ...path, "sessions"), c.id),
    labsState = useLive(() => collection(db, "labs"), "class-labs");

  const labs = labsState.data || [];
  const labMap = Object.fromEntries(labs.map((l) => [l.id, l]));

  const rows = (list.data || [])
      .filter((s) => s.status !== "diarsipkan")
      .sort((a, b) => (a.at?.toMillis?.() || 0) - (b.at?.toMillis?.() || 0)),
    s = rows.find((x) => x.id === sid);

  if (s)
    return (
      <Session
        key={s.id}
        {...{ c, s, u, staff, name, labMap, labs, onOpenAttendance }}
        back={() => I(null)}
      />
    );

  return (
    <>
      <Btn tone="quiet" title="‹ Semua kelas" onPress={back} />
      <Banner
        title={c.title}
        tag="KELAS PRAKTIKUM"
        detail={c.members.length + " peserta"}
      />
      <Text style={S.brand}>JADWAL PRAKTIKUM</Text>
      <Live v={list}>
        {rows.map((x) => (
          <Entry
            key={x.id}
            title={x.title}
            status={x.status}
            detail={`${fmt(x.at)}${
              x.labId && labMap[x.labId] ? " · " + labMap[x.labId].name : ""
            }`}
            onPress={() => I(x.id)}
          />
        ))}
        {!rows.length && <Note>Belum ada sesi terjadwal.</Note>}
      </Live>
      {staff && (
        <>
          <Editor
            labs={labs}
            save={(d) =>
              addDoc(collection(db, ...path, "sessions"), {
                ...d,
                classId: c.id,
                classTitle: c.title,
                status: "terjadwal",
              })
            }
          />
          <Fold title={"Kelola peserta (" + c.members.length + ")"}>
            {c.members.map((id) => (
              <View key={id}>
                <Text selectable>{id}</Text>
                <Btn
                  tone="danger"
                  title="Keluarkan peserta"
                  onPress={() =>
                    confirm("Keluarkan peserta ini?", () =>
                      updateDoc(ref, { members: arrayRemove(id) }),
                    )
                  }
                />
              </View>
            ))}
            <Input
              label="UID praktikan terdaftar"
              value={uid}
              onChangeText={U}
            />
            <Btn
              title="Tambahkan peserta"
              onPress={act(async () => {
                if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid.trim()))
                  throw Error("UID tidak valid.");
                await updateDoc(ref, { members: arrayUnion(uid.trim()) });
                U("");
              })}
            />
          </Fold>
          <Fold title="Pengaturan kelas">
            <Input label="Nama kelas" value={title} onChangeText={T} />
            <Btn
              title="Ubah kelas"
              onPress={act(() =>
                updateDoc(ref, { title: required(title, 100) }),
              )}
            />
            <Btn
              tone="danger"
              title="Hapus kelas dari jadwal"
              onPress={() =>
                confirm("Arsipkan kelas beserta jadwal?", () =>
                  updateDoc(ref, { archived: true }),
                )
              }
            />
          </Fold>
        </>
      )}
    </>
  );
}

function Editor({ s, labs = [], save }) {
  const [title, T] = useState(s?.title || ""),
    [time, D] = useState(s ? local(s.at) : ""),
    [labId, setLabId] = useState(s?.labId || ""),
    [radius, setRadius] = useState(s?.radius ? String(s.radius) : "");

  return (
    <Fold title={s ? "Edit jadwal & lokasi sesi" : "Tambah sesi"}>
      <Input label="Nama praktikum" value={title} onChangeText={T} />
      <Input
        label="Waktu lokal (YYYY-MM-DD HH:mm)"
        placeholder="2026-11-24 09:00"
        value={time}
        onChangeText={D}
      />

      <View style={{ gap: 7 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: ink }}>
          Pilih Laboratorium
        </Text>
        {labs.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {labs.map((lab) => (
              <Btn
                key={lab.id}
                tone={labId === lab.id ? "primary" : "quiet"}
                title={`${lab.name} (${lab.radius}m)`}
                onPress={() => {
                  setLabId(lab.id);
                  if (!radius) setRadius(String(lab.radius || 50));
                }}
              />
            ))}
          </View>
        ) : (
          <Note tone="warn">
            Belum ada data laboratorium. Tambahkan terlebih dahulu pada tab Peta
            Lab.
          </Note>
        )}
      </View>

      <Input
        label="Radius presensi sesi ini (meter, opsional)"
        keyboardType="numeric"
        placeholder="Otomatis mengikuti radius default lab"
        value={radius}
        onChangeText={setRadius}
      />

      <Btn
        title="Simpan jadwal"
        onPress={act(async () => {
          const dt = new Date(time.replace(" ", "T"));
          if (
            !/^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(time) ||
            !Number.isFinite(+dt) ||
            local(Timestamp.fromDate(dt)) !== time
          )
            throw Error("Tanggal atau waktu tidak valid.");
          if (!labId)
            throw Error("Pilih laboratorium lokasi pelaksanaan praktikum.");

          const parsedRadius = radius.trim() ? parseInt(radius, 10) : null;
          if (
            parsedRadius !== null &&
            (!Number.isFinite(parsedRadius) ||
              parsedRadius < 5 ||
              parsedRadius > 1000)
          ) {
            throw Error("Radius harus bernilai antara 5 sampai 1000 meter.");
          }

          await save({
            title: required(title, 100),
            at: Timestamp.fromDate(dt),
            labId,
            ...(parsedRadius ? { radius: parsedRadius } : {}),
          });
          if (!s) {
            T("");
            D("");
          }
        })}
      />
    </Fold>
  );
}

function Session({
  c,
  s,
  u,
  staff,
  name,
  labMap = {},
  labs = [],
  onOpenAttendance,
  back,
}) {
  const path = ["classes", c.id, "sessions", s.id],
    ref = doc(db, ...path),
    [reason, R] = useState("");
  const rec = useLive(
    () =>
      staff
        ? collection(db, ...path, "records")
        : doc(db, ...path, "records", u.uid),
    s.id + u.uid,
    !staff,
  );
  const rows = staff ? rec.data || [] : rec.data ? [rec.data] : [];
  const lab = s.labId ? labMap[s.labId] : null;

  const submitIzin = () =>
    setDoc(doc(db, ...path, "records", u.uid), {
      kind: "izin",
      name,
      created: serverTimestamp(),
      reason: required(reason, 1500),
      decision: "menunggu",
      ai: "diproses",
    });

  return (
    <>
      <Btn tone="quiet" title={"‹ " + c.title} onPress={back} />
      <Banner
        title={s.title}
        tag={c.title}
        detail={`${fmt(s.at)}${lab ? " · " + lab.name : ""}`}
      />
      <Badge value={s.status} />

      {lab && (
        <Note>
          Lokasi Pelaksanaan: {lab.name} ({lab.building || "Informatika"}) ·
          Radius presensi {s.radius || lab.radius || 50} meter
        </Note>
      )}

      {staff && (
        <>
          <Btn
            title={s.status === "terbuka" ? "Tutup sesi" : "Buka sesi"}
            onPress={() =>
              confirm("Ubah status sesi?", async () => {
                const nextStatus =
                  s.status === "terbuka" ? "ditutup" : "terbuka";
                await updateDoc(ref, { status: nextStatus });

                if (nextStatus === "terbuka") {
                  await notifyUsers({
                    uids: c.members,
                    title: `Presensi Dibuka: ${c.title}`,
                    body: `Sesi "${s.title}" telah dibuka${
                      lab ? ` di ${lab.name}` : ""
                    }. Segera lakukan presensi di lokasi.`,
                    data: {
                      type: "session_opened",
                      classId: c.id,
                      sessionId: s.id,
                    },
                  });
                }
              })
            }
          />
          <Text style={S.brand}>REKAP KEHADIRAN</Text>
        </>
      )}

      <Live v={rec}>
        {staff && (
          <Text>
            {rows.filter((r) => r.kind === "hadir").length} hadir ·{" "}
            {rows.filter((r) => r.kind === "izin").length} pengajuan izin
          </Text>
        )}
        {!rows.length && (
          <Note>Belum ada catatan kehadiran untuk sesi ini.</Note>
        )}
        {rows.map((r) => (
          <Card key={r.id}>
            <Text style={S.brand}>
              {r.name} · {r.kind}
            </Text>
            <Text>{fmt(r.created)}</Text>
            {r.kind === "hadir" && r.location && (
              <Text style={S.small}>
                Terverifikasi GPS: {r.location.distance} m dari{" "}
                {r.location.labName || "Lab"} (maks. {r.location.maxRadius} m)
              </Text>
            )}
            {r.kind === "izin" && (
              <>
                <Text>Alasan: {r.reason}</Text>
                <Text>Kategori AI: {r.category || r.ai}</Text>
                <Text style={S.small}>Keputusan asisten</Text>
                <Badge value={r.decision} />
                {staff &&
                  r.decision === "menunggu" &&
                  ["diterima", "ditolak"].map((decision) => (
                    <Btn
                      key={decision}
                      tone={decision === "ditolak" ? "danger" : "primary"}
                      title={
                        decision === "diterima" ? "Terima izin" : "Tolak izin"
                      }
                      onPress={() =>
                        confirm("Tandai izin " + decision + "?", async () => {
                          await updateDoc(doc(db, ...path, "records", r.id), {
                            decision,
                            reviewer: u.uid,
                            reviewed: serverTimestamp(),
                          });

                          await notifyUsers({
                            uids: [r.id],
                            title: `Pengajuan Izin ${
                              decision === "diterima" ? "Diterima" : "Ditolak"
                            }`,
                            body: `Pengajuan izin Anda pada sesi "${s.title}" (${c.title}) telah ${decision} oleh asisten.`,
                            data: {
                              type: "izin_decision",
                              decision,
                              classId: c.id,
                              sessionId: s.id,
                            },
                          });
                        })
                      }
                    />
                  ))}
              </>
            )}
          </Card>
        ))}

        {!staff && !rows.length && (
          <>
            {s.status === "terbuka" ? (
              <Card>
                <Text style={S.brand}>PRESENSI BERBASIS LOKASI</Text>
                <Text style={S.small}>
                  Pencatatan kehadiran dilakukan melalui halaman khusus presensi
                  untuk memverifikasi koordinat GPS dan radius laboratorium.
                </Text>
                <Btn
                  title="Buka Halaman Presensi"
                  onPress={() => onOpenAttendance(c.id, s.id)}
                />
              </Card>
            ) : (
              <Note>Presensi tidak dibuka.</Note>
            )}

            {s.status !== "ditutup" && (
              <Card>
                <Input
                  label="Alasan izin (dikirim ke model pengajar)"
                  multiline
                  maxLength={1500}
                  value={reason}
                  onChangeText={R}
                />
                <Btn title="Ajukan izin" onPress={act(submitIzin)} />
              </Card>
            )}
          </>
        )}
      </Live>

      {staff && (
        <>
          <Editor
            s={s}
            labs={labs}
            save={async (d) => {
              await updateDoc(ref, d);
              await notifyUsers({
                uids: c.members,
                title: `Perubahan Jadwal: ${c.title}`,
                body: `Sesi "${d.title}" diperbarui menjadi ${fmt(d.at)}${
                  labMap[d.labId] ? ` di ${labMap[d.labId].name}` : ""
                }.`,
                data: {
                  type: "schedule_updated",
                  classId: c.id,
                  sessionId: s.id,
                },
              });
            }}
          />
          <Btn
            tone="danger"
            title="Hapus sesi dari jadwal"
            onPress={() =>
              confirm("Arsipkan sesi ini?", () =>
                updateDoc(ref, { status: "diarsipkan" }),
              )
            }
          />
        </>
      )}
    </>
  );
}

export default function App() {
  const [u, U] = useState(undefined),
    [err, E] = useState("");
  useEffect(
    () =>
      configured ? onAuthStateChanged(auth, U, (e) => E(e.message)) : undefined,
    [],
  );
  return (
    <SafeAreaView style={S.page}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={S.body}
      >
        <View
          style={[
            S.row,
            {
              borderBottomWidth: 1,
              borderBottomColor: border,
              paddingBottom: 16,
            },
          ]}
        >
          <View style={{ backgroundColor: teal, borderRadius: 10, padding: 8 }}>
            <Text style={{ color: "#ddf4af", fontWeight: "800", fontSize: 17 }}>
              Rp
            </Text>
          </View>
          <Text style={{ color: ink, fontSize: 19, fontWeight: "700" }}>
            Ruang Praktikum
          </Text>
        </View>
        {!configured ? (
          <Text>
            Lengkapi konfigurasi Firebase di .env lalu mulai ulang Expo.
          </Text>
        ) : err ? (
          <Text>{err}</Text>
        ) : u === undefined ? (
          <Text>Memuat akun…</Text>
        ) : u ? (
          <Account key={u.uid} u={u} />
        ) : (
          <Login />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
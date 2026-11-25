import React, { useEffect, useState, useRef } from "react";
import {
  Alert,
  useWindowDimensions,
  View,
  Text as NativeText,
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
  doc,
  query,
  where,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { auth, db, configured } from "./client";
import SchedulePicker from "./SchedulePicker";
import ConfirmHost, { confirmAction } from "./src/Confirm";
import {
  MapsScreen,
  AttendanceScreen,
  LabPicker,
  NotificationsPanel,
} from "./src/Sprint3";
import LocalDemo from "./src/LocalDemo";
import { disablePush } from "./src/notifications";
import { callBackend } from "./src/backend";

import {
  useFonts,
  DMSans_400Regular,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";

function Text({ style, ...props }) {
  const flat = StyleSheet.flatten(style) || {};
  const weight =
    Number(flat.fontWeight) || (flat.fontWeight === "bold" ? 700 : 400);
  const fontFamily =
    weight >= 700
      ? "DMSans_700Bold"
      : weight >= 500
        ? "DMSans_600SemiBold"
        : "DMSans_400Regular";
  return (
    <NativeText
      {...props}
      style={[
        { color: "#24324c" },
        style,
        { fontFamily, fontWeight: "normal" },
      ]}
    />
  );
}
const ink = "#24324c",
  teal = "#5146c8",
  muted = "#68758c",
  border = "#e3e7f0";
const S = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#f5f6fb",
    paddingTop: StatusBar.currentHeight || 0,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 28,
    gap: 16,
    width: "100%",
    maxWidth: 1020,
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
    shadowColor: "#313650",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.035,
    shadowRadius: 16,
    elevation: 1,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  small: { color: muted, fontSize: 14, lineHeight: 21 },
  input: {
    borderWidth: 1,
    borderColor: "#d7ddea",
    borderRadius: 14,
    minHeight: 52,
    fontFamily: "DMSans_400Regular",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: ink,
    backgroundColor: "#fafbfe",
  },
  hero: {
    overflow: "hidden",
    padding: 28,
    borderRadius: 24,
    backgroundColor: "#292650",
    gap: 10,
  },
  heroTitle: {
    fontWeight: "800",
    fontSize: 29,
    color: "#fff",
    letterSpacing: -0.6,
    lineHeight: 37,
  },
  heroSub: { color: "#dcdef4", fontSize: 15, lineHeight: 23 },
});
function Btn({ title, onPress, tone = "primary" }) {
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  async function handlePress() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      await onPress();
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  const quiet = tone === "quiet",
    danger = tone === "danger";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      disabled={busy}
      accessibilityState={{ disabled: busy, busy }}
      style={({ pressed }) => ({
        backgroundColor: quiet ? "transparent" : danger ? "#fff2ee" : teal,
        borderRadius: 14,
        minHeight: 52,
        borderWidth: quiet ? 0 : 1,
        borderColor: danger ? "#f3dcd5" : "#5146c8",
        transform: [{ scale: pressed ? 0.985 : 1 }],
        paddingHorizontal: quiet ? 4 : 17,
        paddingVertical: 10,
        alignSelf: quiet ? "flex-start" : "stretch",
        justifyContent: "center",
        alignItems: "center",
        opacity: busy || pressed ? 0.72 : 1,
      })}
    >
      <Text
        style={{
          fontWeight: "700",
          fontSize: 15,
          color: quiet ? teal : danger ? "#963b31" : "white",
        }}
      >
        {busy ? "Memproses…" : title}
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
function Card({ children }) {
  const compact = useWindowDimensions().width < 600;
  return (
    <View
      style={[S.card, compact && { padding: 20, borderRadius: 20, gap: 16 }]}
    >
      {children}
    </View>
  );
}
function Badge({ value }) {
  const colors = {
    terbuka: ["#d6f1df", "#195a39"],
    diterima: ["#d6f1df", "#195a39"],
    menunggu: ["#fff2ca", "#77570a"],
    ditolak: ["#ffebe7", "#873c35"],
    terjadwal: ["#eeebff", "#5146aa"],
    ditutup: ["#edf0f6", "#58657b"],
    Asisten: ["#eeebff", "#5146aa"],
    Praktikan: ["#e5f3ef", "#25654f"],
  };
  const [bg, fg] = colors[value] || ["#e8eeed", "#405955"];
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
        {value.charAt(0).toUpperCase() + value.slice(1)}
      </Text>
    </View>
  );
}
function Banner({ title, detail, tag, status }) {
  return (
    <View style={S.hero}>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        style={{
          position: "absolute",
          right: -35,
          top: -65,
          width: 190,
          height: 190,
          borderRadius: 100,
          borderWidth: 32,
          borderColor: "#3a3568",
        }}
      />
      {tag && (
        <Text
          style={{
            color: "#c6c0ff",
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
      {status && <Badge value={status} />}
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
        { padding: 18, backgroundColor: pressed ? "#f2f0ff" : "white" },
      ]}
    >
      <View
        style={{ backgroundColor: "#efedff", borderRadius: 16, padding: 14 }}
      >
        <Text style={{ color: teal, fontSize: 20, fontWeight: "700" }}>
          {status ? "◷" : "▦"}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
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
function Fold({ title, children }) {
  const [open, set] = useState(false);
  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={[S.row, { minHeight: 40 }]}
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
function Note({ children }) {
  return (
    <View style={{ backgroundColor: "#edf0f8", borderRadius: 12, padding: 14 }}>
      <Text style={S.small}>{children}</Text>
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
            backgroundColor: ["#9286d8", "#c2b7f3", "#eee7ff"][i % 3],
            transform: [{ rotate: "24deg" }],
          }}
        />
      ))}
    </View>
  );
}
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
const confirm = confirmAction;
function required(v, n) {
  if (!v.trim() || v.trim().length > n)
    throw Error("Isi teks 1–" + n + " karakter.");
  return v.trim();
}
function useLive(ref, key, single = false) {
  const [state, put] = useState({});
  useEffect(() => {
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
              : snap.docs.map((d) => ({ ...d.data(), id: d.id })),
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
        <Text>Mengirim perubahan…</Text>
      ) : v.cache ? (
        <Text>Menunggu koneksi ke server…</Text>
      ) : null}
      {children}
    </>
  );
}
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
          <Text style={S.heroTitle}>
            {wide ? "Ruang Praktikum" : "Portal praktikum"}
          </Text>
          <Text style={S.heroSub}>
            Jadwal, presensi, dan izin praktikum dalam satu ruang.
          </Text>
        </View>
        {wide && <LoginArt />}
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
    [error, E] = useState("");
  useEffect(() => {
    u.getIdTokenResult()
      .then((r) => R(r.claims.asisten === true))
      .catch((e) => E(e.message));
  }, [u]);
  return (
    <>
      <View
        style={[
          S.row,
          {
            flexWrap: "wrap",
            justifyContent: "space-between",
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: border,
            borderRadius: 18,
            padding: 14,
          },
        ]}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Badge
            value={
              role === null ? "Memuat peran" : role ? "Asisten" : "Praktikan"
            }
          />
          <Text style={S.small}>{u.email}</Text>
        </View>
        <Btn
          tone="quiet"
          title="Keluar"
          onPress={act(async () => {
            await disablePush(u.uid);
            await signOut(auth);
          })}
        />
      </View>
      {error ? <Text>{error}</Text> : null}
      <Live v={profile}>
        {profile.data ? (
          role !== null && <Home u={u} staff={role} name={profile.data.name} />
        ) : (
          <Card>
            <Input label="Nama lengkap" value={name} onChangeText={N} />
            <Btn
              title="Simpan profil"
              onPress={act(() =>
                setDoc(doc(db, "profiles", u.uid), {
                  name: required(name, 80),
                }),
              )}
            />
          </Card>
        )}
      </Live>
    </>
  );
}
function Home({ u, staff, name }) {
  const [page, Page] = useState("classes");
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
  if (page === "maps")
    return (
      <MapsScreen
        {...{ u, staff }}
        classes={rows}
        back={() => Page("classes")}
      />
    );
  if (page === "notifications")
    return (
      <>
        <Btn title="‹ Semua kelas" onPress={() => Page("classes")} />
        <NotificationsPanel u={u} />
      </>
    );
  return (
    <Live v={list}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <Btn
          tone="quiet"
          title="Peta & Laboratorium"
          onPress={() => Page("maps")}
        />
        <Btn
          tone="quiet"
          title="Notifikasi"
          onPress={() => Page("notifications")}
        />
      </View>
      {selected ? (
        <ClassView
          key={cid}
          c={selected}
          {...{ u, staff, name }}
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
function ClassView({ c, u, staff, name, back }) {
  const [sid, I] = useState(null),
    [title, T] = useState(c.title),
    [uid, U] = useState("");
  const path = ["classes", c.id],
    ref = doc(db, ...path),
    list = useLive(() => collection(db, ...path, "sessions"), c.id);
  const rows = (list.data || [])
      .filter((s) => s.status !== "diarsipkan")
      .sort((a, b) => a.at - b.at),
    s = rows.find((x) => x.id === sid);
  if (s)
    return (
      <Session key={s.id} {...{ c, s, u, staff, name }} back={() => I(null)} />
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
            detail={fmt(x.at)}
            onPress={() => I(x.id)}
          />
        ))}
        {!rows.length && <Note>Belum ada sesi terjadwal.</Note>}
      </Live>
      {staff && (
        <>
          <Editor
            save={(d) =>
              addDoc(collection(db, ...path, "sessions"), {
                ...d,
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
                if (!uid.trim() || uid.trim().length > 128 || uid.includes("/"))
                  throw Error("UID tidak valid.");
                if (c.members.includes(uid.trim()))
                  throw Error("Peserta sudah terdaftar di kelas ini.");
                if (c.members.length >= 200)
                  throw Error("Kelas sudah memiliki 200 peserta.");
                try {
                  await updateDoc(ref, { members: arrayUnion(uid.trim()) });
                } catch (error) {
                  if (error.code === "permission-denied")
                    throw Error(
                      "Peserta gagal ditambahkan. Pastikan UID benar, praktikan telah menyimpan profil, dan Anda masih mengelola kelas ini.",
                    );
                  throw error;
                }
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
const fmt = (t) =>
  t?.toDate().toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) || "Menunggu server";
function local(t) {
  const d = t.toDate();
  return new Date(+d - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
}
function Editor({ s, save }) {
  const [title, T] = useState(s?.title || ""),
    [time, D] = useState(s ? local(s.at) : ""),
    [labId, Lab] = useState(s?.labId || "");
  return (
    <Fold title={s ? "Edit jadwal sesi" : "Tambah sesi"}>
      <Input label="Nama praktikum" value={title} onChangeText={T} />
      <LabPicker value={labId} onChange={Lab} />
      <SchedulePicker
        value={time}
        onChange={D}
        minimumDate={local(Timestamp.now()).slice(0, 10)}
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
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (dt < today && (!s || time !== local(s.at)))
            throw Error("Tanggal praktikum tidak boleh sebelum hari ini.");
          if (!labId) throw Error("Pilih laboratorium untuk sesi ini.");
          await save({
            labId,
            title: required(title, 100),
            at: Timestamp.fromDate(dt),
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
function Session({ c, s, u, staff, name, back }) {
  const path = ["classes", c.id, "sessions", s.id],
    ref = doc(db, ...path),
    [reason, R] = useState(""),
    [attendance, Attend] = useState(false);
  const rec = useLive(
    () =>
      staff
        ? collection(db, ...path, "records")
        : doc(db, ...path, "records", u.uid),
    c.id + "/" + s.id + "/" + u.uid + "/" + staff,
    !staff,
  );
  const rows = staff ? rec.data || [] : rec.data ? [rec.data] : [];
  const submit = (kind) =>
    setDoc(doc(db, ...path, "records", u.uid), {
      kind,
      name,
      created: serverTimestamp(),
      ...(kind === "izin"
        ? {
            reason: required(reason, 1500),
            decision: "menunggu",
            ai: "diproses",
          }
        : {}),
    });
  if (attendance)
    return <AttendanceScreen {...{ c, s, u }} back={() => Attend(false)} />;
  return (
    <>
      <Btn tone="quiet" title={"‹ " + c.title} onPress={back} />
      <Banner
        title={s.title}
        tag={c.title}
        detail={fmt(s.at)}
        status={s.status}
      />
      {staff && (
        <>
          <Btn
            title={s.status === "terbuka" ? "Tutup sesi" : "Buka sesi"}
            onPress={() =>
              confirm("Ubah status sesi?", () =>
                updateDoc(ref, {
                  status: s.status === "terbuka" ? "ditutup" : "terbuka",
                }),
              )
            }
          />
          <Text style={S.brand}>REKAP KEHADIRAN</Text>
        </>
      )}
      <Live v={rec}>
        {staff && (
          <View style={S.row}>
            {[
              ["hadir", "Hadir"],
              ["izin", "Pengajuan izin"],
            ].map(([kind, label]) => (
              <View
                key={kind}
                style={{
                  flex: 1,
                  padding: 15,
                  borderRadius: 14,
                  backgroundColor: kind === "hadir" ? "#e7f4ef" : "#fff1d3",
                }}
              >
                <Text style={{ fontSize: 24, fontWeight: "800", color: ink }}>
                  {rows.filter((r) => r.kind === kind).length}
                </Text>
                <Text style={S.small}>{label}</Text>
              </View>
            ))}
          </View>
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
            {r.kind === "izin" && (
              <>
                <Text>Alasan: {r.reason}</Text>
                <Text>Kategori AI: {r.category || r.ai}</Text>
                <Text style={S.small}>
                  AI hanya membantu klasifikasi; keputusan tetap oleh asisten.
                </Text>
                {staff && r.ai !== "selesai" && (
                  <Btn
                    tone="quiet"
                    title="Coba klasifikasi AI"
                    onPress={act(() =>
                      callBackend("retryClassification", {
                        classId: c.id,
                        sessionId: s.id,
                        uid: r.id,
                      }),
                    )}
                  />
                )}
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
                        confirm("Tandai izin " + decision + "?", () =>
                          updateDoc(doc(db, ...path, "records", r.id), {
                            decision,
                            reviewer: u.uid,
                            reviewed: serverTimestamp(),
                          }),
                        )
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
              <Btn title="Buka halaman presensi" onPress={() => Attend(true)} />
            ) : (
              <Note>Presensi tidak dibuka.</Note>
            )}
            {s.status !== "ditutup" && (
              <Card>
                <Input
                  label="Alasan izin"
                  multiline
                  maxLength={1500}
                  value={reason}
                  onChangeText={R}
                />
                <Btn title="Ajukan izin" onPress={act(() => submit("izin"))} />
              </Card>
            )}
          </>
        )}
      </Live>
      {staff && (
        <>
          <Editor s={s} save={(d) => updateDoc(ref, d)} />
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
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  const compact = useWindowDimensions().width < 600;
  const [localDemo, Demo] = useState(false);
  const [u, U] = useState(undefined),
    [err, E] = useState("");
  useEffect(
    () =>
      configured ? onAuthStateChanged(auth, U, (e) => E(e.message)) : undefined,
    [],
  );
  if (!fontsLoaded && !fontError)
    return (
      <SafeAreaView style={S.page}>
        <NativeText style={{ padding: 24 }}>Memuat tampilan…</NativeText>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={S.page}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f6fb" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          S.body,
          compact && { paddingHorizontal: 14, paddingTop: 12, gap: 12 },
        ]}
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
            <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 17 }}>
              Rp
            </Text>
          </View>
          <Text style={{ color: ink, fontSize: 19, fontWeight: "700" }}>
            Ruang Praktikum
          </Text>
        </View>
        {process.env.EXPO_PUBLIC_DEMO === "1" && (
          <Note>
            Mode emulator lokal — data ini terpisah dari Firebase online.
          </Note>
        )}
        <Btn
          tone="quiet"
          title={localDemo ? "Kembali ke Firebase" : "Demo lokal Sprint 1"}
          onPress={() => Demo(!localDemo)}
        />
        {localDemo ? (
          <LocalDemo back={() => Demo(false)} />
        ) : !configured ? (
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
      <ConfirmHost />
    </SafeAreaView>
  );
}

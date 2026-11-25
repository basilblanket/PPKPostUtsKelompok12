import React, { useEffect, useState, useRef } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { callBackend } from "./backend";
import { db } from "../client";
import LabMap from "./LabMap";
import { locate, distance, watch } from "./location";
import { enablePush, disablePush } from "./notifications";
const box = {
  backgroundColor: "#fff",
  borderRadius: 20,
  padding: 18,
  gap: 12,
  borderWidth: 1,
  borderColor: "#e1e5f1",
};
const title = { fontSize: 20, fontWeight: "700", color: "#303555" };
export function Button({ children, onPress }) {
  const running = useRef(false);
  const [busy, B] = useState(false),
    [error, E] = useState("");
  return (
    <View style={{ gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={async () => {
          if (running.current) return;
          running.current = true;
          B(true);
          E("");
          try {
            await onPress();
          } catch (e) {
            E(e.message || "Gagal memproses. Periksa koneksi.");
          } finally {
            running.current = false;
            B(false);
          }
        }}
        style={{
          padding: 14,
          borderRadius: 13,
          backgroundColor: busy ? "#9a97c5" : "#6059d9",
        }}
      >
        <Text
          style={{ color: "white", textAlign: "center", fontWeight: "600" }}
        >
          {busy ? "Memproses…" : children}
        </Text>
      </Pressable>
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: "#a72e43" }}>
          {error}
        </Text>
      )}
    </View>
  );
}
function Field({ label, value, onChangeText }) {
  return (
    <View style={{ gap: 6 }}>
      <Text>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        style={{
          borderWidth: 1,
          borderColor: "#ccd1e3",
          padding: 13,
          borderRadius: 12,
        }}
      />
    </View>
  );
}
export function useRows(ref, key) {
  const [state, S] = useState({});
  useEffect(
    () =>
      onSnapshot(
        ref(),
        (snap) =>
          S({ key, rows: snap.docs.map((d) => ({ ...d.data(), id: d.id })) }),
        (e) => S({ key, error: e.message }),
      ),
    [key],
  );
  return state.key === key ? state : {};
}
function Info({ data }) {
  return data.error ? (
    <Text accessibilityRole="alert">Gagal memuat: {data.error}</Text>
  ) : !data.rows ? (
    <Text>Memuat…</Text>
  ) : null;
}
export function LabPicker({ value, onChange }) {
  const data = useRows(() => collection(db, "labs"), "labs");
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: "700" }}>Laboratorium sesi</Text>
      <Info data={data} />
      {data.rows
        ?.filter((l) => !l.archived)
        .map((l) => (
          <Pressable
            key={l.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === l.id }}
            onPress={() => onChange(l.id)}
            style={{
              padding: 12,
              borderRadius: 10,
              backgroundColor: value === l.id ? "#e5e3ff" : "#f4f5fa",
            }}
          >
            <Text>
              {value === l.id ? "●" : "○"} {l.title} · {l.radius} m
            </Text>
          </Pressable>
        ))}
      {data.rows && !data.rows.some((l) => !l.archived) && (
        <Text>
          Tambahkan laboratorium melalui halaman Peta & Laboratorium terlebih
          dahulu.
        </Text>
      )}
    </View>
  );
}
function LabEditor({ lab, u, onDone }) {
  const [name, N] = useState(lab?.title || ""),
    [lat, A] = useState(String(lab?.latitude ?? "")),
    [lon, O] = useState(String(lab?.longitude ?? "")),
    [radius, R] = useState(String(lab?.radius ?? 100));
  return (
    <View style={box}>
      <Text style={title}>{lab ? "Edit" : "Tambah"} laboratorium</Text>
      <Field label="Nama laboratorium" value={name} onChangeText={N} />
      <Field label="Latitude" value={lat} onChangeText={A} />
      <Field label="Longitude" value={lon} onChangeText={O} />
      <Field
        label="Radius presensi (10–1000 meter)"
        value={radius}
        onChangeText={R}
      />
      <Text>
        Gunakan koordinat laboratorium yang benar. Tombol berikut hanya
        digunakan ketika Anda berada di laboratorium.
      </Text>
      <Button
        onPress={async () => {
          const p = await locate();
          A(String(p.latitude));
          O(String(p.longitude));
        }}
      >
        Gunakan lokasi perangkat
      </Button>
      <Button
        onPress={async () => {
          const latitude = Number(lat),
            longitude = Number(lon),
            r = Number(radius);
          if (
            !name.trim() ||
            name.length > 100 ||
            !lat.trim() ||
            !lon.trim() ||
            !Number.isFinite(latitude) ||
            Math.abs(latitude) > 90 ||
            !Number.isFinite(longitude) ||
            Math.abs(longitude) > 180 ||
            !Number.isFinite(r) ||
            r < 10 ||
            r > 1000
          )
            throw Error("Isi nama, koordinat valid, dan radius 10–1000 meter.");
          const d = {
            title: name.trim(),
            latitude,
            longitude,
            radius: r,
            owner: u.uid,
            archived: false,
          };
          if (lab) await updateDoc(doc(db, "labs", lab.id), d);
          else await addDoc(collection(db, "labs"), d);
          onDone();
        }}
      >
        Simpan laboratorium
      </Button>
      <Button onPress={onDone}>Batal</Button>
    </View>
  );
}
function Activities({ c, labId, now }) {
  const data = useRows(() => collection(db, "classes", c.id, "sessions"), c.id);
  const rows = (data.rows || []).filter(
    (s) => s.labId === labId && s.status !== "diarsipkan",
  );
  const current = rows.filter((s) => s.status === "terbuka"),
    next = rows
      .filter((s) => s.status === "terjadwal" && s.at.toMillis() >= now)
      .sort((a, b) => a.at - b.at)
      .slice(0, 1);
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: "700" }}>{c.title}</Text>
      <Info data={data} />
      {data.rows && !current.length && !next.length && (
        <Text>Tidak ada sesi berlangsung atau berikutnya untuk kelas ini.</Text>
      )}
      {[...current, ...next].map((s) => (
        <Text key={s.id}>
          {s.status === "terbuka" ? "Berlangsung" : "Berikutnya"} · {s.title}
          {"\n"}
          {s.at.toDate().toLocaleString("id-ID")} · {s.status}
        </Text>
      ))}
    </View>
  );
}
export function MapsScreen({ u, staff, classes, back }) {
  const data = useRows(() => collection(db, "labs"), "map-labs"),
    [position, P] = useState(null),
    [error, E] = useState(""),
    [tracking, T] = useState(false),
    [selected, S] = useState(null),
    [editing, D] = useState(undefined),
    [now, N] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => N(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!tracking) return;
    let stop,
      cancelled = false;
    watch(
      (p) => {
        if (!cancelled) {
          P(p);
          E("");
        }
      },
      (e) => {
        if (!cancelled) E(String(e));
      },
    )
      .then((s) => {
        if (cancelled) s.remove();
        else stop = s;
      })
      .catch((e) => {
        if (!cancelled) {
          E(e.message);
          T(false);
        }
      });
    return () => {
      cancelled = true;
      stop?.remove();
    };
  }, [tracking]);
  const labs = (data.rows || []).filter((l) => !l.archived),
    lab = labs.find((l) => l.id === selected);
  return (
    <View style={{ gap: 14 }}>
      <Button onPress={back}>‹ Kembali ke kelas</Button>
      <Text style={title}>Peta & Laboratorium</Text>
      <Text>
        Pilih marker atau laboratorium. Aktivitas ditampilkan untuk kelas yang
        dapat Anda akses.
      </Text>
      <Info data={data} />
      <Button
        onPress={() => {
          E("");
          T(!tracking);
        }}
      >
        {tracking ? "Hentikan pelacakan lokasi" : "Tampilkan lokasi saya"}
      </Button>
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
      <LabMap labs={labs} position={position} onSelect={S} />
      {position && (
        <Text>
          Posisi terakhir:{" "}
          {new Date(position.timestamp).toLocaleTimeString("id-ID")} · akurasi ±
          {Math.round(position.accuracy)} m
        </Text>
      )}
      {!labs.length && data.rows && (
        <Text>Belum ada laboratorium. Asisten dapat menambahkan lokasi.</Text>
      )}
      {labs.map((l) => (
        <Pressable
          key={l.id}
          onPress={() => S(l.id)}
          style={[box, l.id === selected && { borderColor: "#6059d9" }]}
        >
          <Text style={title}>{l.title}</Text>
          <Text>Radius {l.radius} m</Text>
        </Pressable>
      ))}
      {lab && (
        <View style={box}>
          <Text style={title}>{lab.title}</Text>
          <Text>
            {lab.latitude}, {lab.longitude} · radius {lab.radius} m
          </Text>
          {classes.map((c) => (
            <Activities key={c.id} c={c} labId={lab.id} now={now} />
          ))}
          {!classes.length && <Text>Belum ada kelas terkait akun Anda.</Text>}
          {staff && lab.owner === u.uid && (
            <Button onPress={() => D(lab)}>Edit lokasi dan radius</Button>
          )}
        </View>
      )}
      {staff && <Button onPress={() => D(null)}>Tambah laboratorium</Button>}
      {editing !== undefined && (
        <LabEditor
          key={editing?.id || "new"}
          lab={editing}
          u={u}
          onDone={() => D(undefined)}
        />
      )}
    </View>
  );
}
export function AttendanceScreen({ c, s, u, back }) {
  const [lab, L] = useState(null),
    [loadError, E] = useState(""),
    [position, P] = useState(null),
    [record, R] = useState(undefined),
    [now, N] = useState(Date.now());
  useEffect(() => {
    if (!s.labId) {
      E("Asisten belum menentukan laboratorium sesi ini.");
      return;
    }
    return onSnapshot(
      doc(db, "labs", s.labId),
      (d) => L(d.exists() ? d.data() : null),
      (e) => E(e.message),
    );
  }, [s.labId]);
  useEffect(
    () =>
      onSnapshot(
        doc(db, "classes", c.id, "sessions", s.id, "records", u.uid),
        (d) => R(d.exists() ? d.data() : null),
        (e) => E(e.message),
      ),
    [c.id, s.id, u.uid],
  );
  useEffect(() => {
    const t = setInterval(() => N(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const meters = lab && position ? distance(position, lab) : null,
    good =
      position &&
      lab &&
      !lab.archived &&
      now - position.timestamp < 60000 &&
      position.accuracy <= Math.min(lab.radius, 100) &&
      meters <= lab.radius;
  return (
    <View style={{ gap: 14 }}>
      <Button onPress={back}>‹ Detail sesi</Button>
      <View style={box}>
        <Text style={title}>Presensi berbasis lokasi</Text>
        <Text>
          {s.title} · {c.title}
        </Text>
        <Text>
          {s.at.toDate().toLocaleString("id-ID")} · {s.status}
        </Text>
        {lab && (
          <Text>
            {lab.title} · radius {lab.radius} m
          </Text>
        )}
        {!!loadError && <Text accessibilityRole="alert">{loadError}</Text>}
        {record === undefined ? (
          <Text>Memuat catatan presensi…</Text>
        ) : record ? (
          <Text>
            {record.kind === "hadir"
              ? "Presensi berhasil tersimpan"
              : "Pengajuan izin sudah tercatat"}{" "}
            ·{" "}
            {record.created?.toDate().toLocaleString("id-ID") ||
              "Menunggu server"}
          </Text>
        ) : (
          <>
            <Button
              onPress={async () => {
                P(null);
                P(await locate());
              }}
            >
              Periksa lokasi perangkat
            </Button>
            {position && (
              <Text>
                Jarak{" "}
                {meters === null
                  ? "belum diketahui"
                  : Math.round(meters) + " m"}{" "}
                · akurasi ±{Math.round(position.accuracy)} m{"\n"}
                {good
                  ? "Lokasi memenuhi radius."
                  : now - position.timestamp >= 60000
                    ? "Lokasi kedaluwarsa; periksa kembali."
                    : "Lokasi di luar radius, belum akurat, atau laboratorium tidak tersedia."}
              </Text>
            )}
            {s.status !== "terbuka" && (
              <Text>Sesi belum dibuka atau sudah ditutup.</Text>
            )}
            <Button
              onPress={async () => {
                if (s.status !== "terbuka") throw Error("Sesi tidak terbuka.");
                if (!lab || lab.archived)
                  throw Error("Lokasi laboratorium belum tersedia.");
                const p = await locate();
                P(p);
                try {
                  await callBackend("attendSession", {
                    classId: c.id,
                    sessionId: s.id,
                    location: p,
                  });
                } catch (e) {
                  if (
                    [
                      "functions/not-found",
                      "functions/unavailable",
                      "functions/internal",
                    ].includes(e.code)
                  )
                    throw Error(
                      "Layanan presensi belum tersedia atau koneksi terganggu. Presensi belum dikonfirmasi; periksa catatan sebelum mencoba kembali.",
                    );
                  throw e;
                }
              }}
            >
              Catat presensi
            </Button>
            <Text>
              Lokasi diperiksa ulang saat menyimpan. Presensi berhasil hanya
              setelah server menyetujui.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}
export function NotificationsPanel({ u }) {
  const data = useRows(
      () =>
        query(
          collection(db, "profiles", u.uid, "notifications"),
          orderBy("created", "desc"),
          limit(20),
        ),
      u.uid + "notifications",
    ),
    [message, M] = useState("");
  return (
    <View style={box}>
      <Text style={title}>Notifikasi kegiatan</Text>
      <Text>Aktifkan pada perangkat yang ingin menerima pemberitahuan.</Text>
      <Button
        onPress={async () => {
          await enablePush(u.uid);
          M(
            "Perangkat terdaftar untuk push notification. Pengiriman membutuhkan layanan server aktif.",
          );
        }}
      >
        Aktifkan notifikasi
      </Button>
      <Button
        onPress={async () => {
          await disablePush(u.uid);
          M("Notifikasi perangkat dinonaktifkan.");
        }}
      >
        Matikan notifikasi perangkat
      </Button>
      {!!message && <Text>{message}</Text>}
      <Info data={data} />
      {data.rows?.length === 0 && <Text>Belum ada pemberitahuan.</Text>}
      {data.rows?.map((n) => (
        <Pressable
          key={n.id}
          onPress={() =>
            updateDoc(doc(db, "profiles", u.uid, "notifications", n.id), {
              read: true,
            }).catch((e) => M(e.message))
          }
          style={{
            padding: 12,
            borderRadius: 10,
            backgroundColor: n.read ? "#f7f8fb" : "#eeecff",
          }}
        >
          <Text style={{ fontWeight: "700" }}>{n.title}</Text>
          <Text>{n.body}</Text>
          <Text>
            {n.pushStatus} · {n.read ? "dibaca" : "ketuk untuk tandai dibaca"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

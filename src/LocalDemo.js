import React, { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { Button } from "./Sprint3";
import { confirmAction } from "./Confirm";
export default function LocalDemo({ back }) {
  const [role, R] = useState("asisten"),
    [uid, U] = useState("Putri"),
    [selected, S] = useState(null),
    [sessions, D] = useState([
      {
        id: "1",
        title: "Pemrograman Mobile",
        className: "Kelas A",
        at: new Date().toLocaleString("id-ID"),
        status: "terjadwal",
        records: [],
      },
      {
        id: "2",
        title: "Basis Data",
        className: "Kelas B",
        at: new Date(Date.now() + 86400000).toLocaleString("id-ID"),
        status: "terjadwal",
        records: [],
      },
    ]);
  const s = sessions.find((x) => x.id === selected);
  const patch = (d) =>
    D((rows) => rows.map((x) => (x.id === s.id ? { ...x, ...d } : x)));
  return (
    <View style={{ gap: 14 }}>
      <Button onPress={back}>‹ Kembali ke aplikasi</Button>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>
        Demo lokal · Sprint 1
      </Text>
      <Text>
        Data dummy tersimpan di state selama demo terbuka. Tidak mengubah
        Firebase.
      </Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {["asisten", "praktikan"].map((r) => (
          <Pressable
            key={r}
            onPress={() => R(r)}
            style={{
              flex: 1,
              padding: 14,
              backgroundColor: role === r ? "#dfdcff" : "#fff",
              borderRadius: 12,
            }}
          >
            <Text>{r}</Text>
          </Pressable>
        ))}
      </View>
      {role === "praktikan" && (
        <View style={{ flexDirection: "row", gap: 12 }}>
          {["Putri", "Raka"].map((n) => (
            <Button key={n} onPress={() => U(n)}>
              {uid === n ? "● " : ""}
              {n}
            </Button>
          ))}
        </View>
      )}
      {!s ? (
        sessions.map((x) => (
          <Button key={x.id} onPress={() => S(x.id)}>
            {x.title} · {x.className} · {x.status}
          </Button>
        ))
      ) : (
        <>
          <Button onPress={() => S(null)}>‹ Jadwal</Button>
          <Text style={{ fontSize: 20 }}>
            {s.title} · {s.className}
          </Text>
          <Text>
            {s.at} · {s.status}
          </Text>
          {role === "asisten" ? (
            <>
              <Button
                onPress={() =>
                  confirmAction(
                    s.status === "terbuka" ? "Tutup sesi?" : "Buka sesi?",
                    () =>
                      patch({
                        status: s.status === "terbuka" ? "ditutup" : "terbuka",
                      }),
                  )
                }
              >
                {s.status === "terbuka" ? "Tutup sesi" : "Buka sesi"}
              </Button>
              <Text>Nama praktikum</Text>
              <TextInput
                accessibilityLabel="Nama praktikum dummy"
                value={s.title}
                onChangeText={(title) => patch({ title })}
                maxLength={100}
                style={{
                  padding: 14,
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 12,
                }}
              />
              <Text>Rekap kehadiran</Text>
              {!s.records.length && (
                <Text>Belum ada praktikan yang hadir.</Text>
              )}
              {s.records.map((r) => (
                <Text key={r.uid}>
                  {r.uid} · {r.time}
                </Text>
              ))}
            </>
          ) : s.records.some((r) => r.uid === uid) ? (
            <Text>
              Presensi berhasil · {s.records.find((r) => r.uid === uid).time}
            </Text>
          ) : s.status === "terbuka" ? (
            <Button
              onPress={() =>
                D((rows) =>
                  rows.map((x) =>
                    x.id === s.id && !x.records.some((r) => r.uid === uid)
                      ? {
                          ...x,
                          records: [
                            ...x.records,
                            { uid, time: new Date().toLocaleString("id-ID") },
                          ],
                        }
                      : x,
                  ),
                )
              }
            >
              Presensi sebagai {uid}
            </Button>
          ) : (
            <Text>Presensi belum dibuka.</Text>
          )}
        </>
      )}
    </View>
  );
}

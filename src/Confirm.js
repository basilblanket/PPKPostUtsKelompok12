import React, { useEffect, useState } from "react";
import { Modal, View, Text, Pressable } from "react-native";
let show;
export function confirmAction(title, action) {
  return new Promise((resolve) => {
    if (!show) return resolve();
    show({ title, action, resolve });
  });
}
export default function ConfirmHost() {
  const [item, S] = useState(null),
    [busy, B] = useState(false),
    [error, E] = useState("");
  useEffect(() => {
    show = (x) => {
      E("");
      S(x);
    };
    return () => {
      show = null;
    };
  }, []);
  function close() {
    if (busy) return;
    item?.resolve();
    S(null);
  }
  return (
    <Modal
      visible={!!item}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#18213999",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            width: "100%",
            maxWidth: 420,
            padding: 24,
            gap: 18,
            borderRadius: 24,
            backgroundColor: "white",
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "700" }}>{item?.title}</Text>
          <Text>Perubahan berlaku bagi pengguna terkait.</Text>
          {!!error && (
            <Text accessibilityRole="alert" style={{ color: "#a72e43" }}>
              {error}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={async () => {
              B(true);
              E("");
              try {
                await item.action();
                item.resolve();
                S(null);
              } catch (e) {
                E(e.message);
              } finally {
                B(false);
              }
            }}
            style={{
              padding: 15,
              borderRadius: 12,
              backgroundColor: "#6059d9",
            }}
          >
            <Text style={{ color: "white", textAlign: "center" }}>
              {busy ? "Menyimpan…" : "Lanjutkan"}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={close}>
            <Text style={{ textAlign: "center", padding: 10 }}>Batal</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

import React, { useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function SchedulePicker({ value, onChange, minimumDate }) {
  const [mode, setMode] = useState(null);
  const parsed = new Date(value.replace(" ", "T"));
  const minimum = new Date(minimumDate + "T00:00");
  const selected = Number.isFinite(+parsed)
    ? parsed
    : new Date(minimumDate + "T09:00");
  const pickerValue = selected < minimum ? minimum : selected;
  const format = (date) =>
    new Date(+date - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
      .replace("T", " ");
  return (
    <View style={{ gap: 12 }}>
      {[
        ["date", "Tanggal praktikum"],
        ["time", "Jam praktikum"],
      ].map(([part, label]) => (
        <View key={part} style={{ gap: 7 }}>
          <Text style={{ color: "#24324c", fontWeight: "600" }}>{label}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => setMode(part)}
            style={{
              minHeight: 48,
              borderWidth: 1,
              borderColor: "#d7ddea",
              padding: 13,
              borderRadius: 14,
              backgroundColor: "#fafbfe",
            }}
          >
            <Text style={{ color: "#24324c", fontSize: 16 }}>
              {value.trim()
                ? part === "date"
                  ? selected.toLocaleDateString("id-ID")
                  : selected.toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                : "Pilih " + (part === "date" ? "tanggal" : "jam")}
            </Text>
          </Pressable>
        </View>
      ))}
      {mode && (
        <DateTimePicker
          value={pickerValue}
          mode={mode}
          minimumDate={minimum}
          is24Hour
          onChange={(event, date) => {
            if (Platform.OS === "android" || event.type === "dismissed")
              setMode(null);
            if (event.type !== "dismissed" && date && date >= minimum)
              onChange(format(date));
          }}
        />
      )}
      {mode && Platform.OS === "ios" && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setMode(null)}
          style={{ padding: 14, borderRadius: 14, backgroundColor: "#5146c8" }}
        >
          <Text
            style={{ color: "white", fontWeight: "700", textAlign: "center" }}
          >
            Selesai
          </Text>
        </Pressable>
      )}
      <Text style={{ color: "#68758c", fontSize: 13 }}>
        Pilih hari ini atau tanggal berikutnya. Jam mengikuti waktu perangkat.
      </Text>
    </View>
  );
}

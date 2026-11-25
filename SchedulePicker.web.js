import React from "react";
import { View, Text } from "react-native";

export default function SchedulePicker({ value, onChange, minimumDate }) {
  const [date = "", time = ""] = value.split(" ");
  const style = {
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
    minHeight: 48,
    border: "1px solid #d7ddea",
    borderRadius: 14,
    padding: "12px",
    font: "inherit",
    fontSize: 16,
    color: "#24324c",
    background: "#fafbfe",
  };
  return (
    <View style={{ gap: 12 }}>
      <label
        style={{
          display: "grid",
          gap: 7,
          fontSize: 14,
          fontWeight: 600,
          color: "#24324c",
        }}
      >
        Tanggal praktikum
        <input
          aria-label="Tanggal praktikum"
          type="date"
          min={minimumDate}
          value={date}
          style={style}
          onChange={(event) => {
            const next = event.target.value;
            if (!next || next >= minimumDate)
              onChange(next + " " + (time || "09:00"));
          }}
        />
      </label>
      <label
        style={{
          display: "grid",
          gap: 7,
          fontSize: 14,
          fontWeight: 600,
          color: "#24324c",
        }}
      >
        Jam praktikum
        <input
          aria-label="Jam praktikum"
          type="time"
          step="60"
          value={time}
          style={style}
          onChange={(event) =>
            onChange((date || minimumDate) + " " + event.target.value)
          }
        />
      </label>
      <Text style={{ color: "#68758c", fontSize: 13 }}>
        Pilih hari ini atau tanggal berikutnya. Jam mengikuti waktu perangkat.
      </Text>
    </View>
  );
}

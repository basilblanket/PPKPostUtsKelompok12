const { initializeApp } = require("firebase-admin/app");
initializeApp();
Object.assign(
  exports,
  require("./attendance.cjs"),
  require("./ai.cjs"),
  require("./push.cjs"),
);

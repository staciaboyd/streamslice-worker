import express from "express";
import cors from "cors";
import multer from "multer";
import archiver from "archiver";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 10000;

/* -------------------- MIDDLEWARE -------------------- */
app.use(cors());
app.use(express.json());

/* -------------------- UPLOAD SETUP -------------------- */
const upload = multer({ dest: "/tmp" });

/* -------------------- HEALTH CHECK -------------------- */
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "streamslice-worker" });
});

/* -------------------- TEST EXPORT ENDPOINT -------------------- */
/*
  This is a SAFE placeholder endpoint.
  It proves:
  - archiver works
  - server stays alive
  - Render can connect
*/
app.post("/export-manual", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("Received file:", req.file.originalname);

    res.json({
      success: true,
      message: "Export received (processing will be added next)"
    });
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ error: "Export failed" });
  }
});

/* -------------------- START SERVER -------------------- */
app.listen(PORT, () => {
  console.log(`🚀 Worker running on port ${PORT}`);
});

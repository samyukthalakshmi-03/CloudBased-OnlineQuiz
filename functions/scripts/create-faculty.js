#!/usr/bin/env node
"use strict";

/**
 * create-faculty.js
 *
 * Provisions a faculty (teacher) account using the trusted Firebase
 * Admin SDK.
 *
 * This mirrors the project's security design: public registration can
 * only create student profiles, while faculty profiles are created by
 * trusted administrative code. The Admin SDK bypasses Firestore security
 * rules, so this script is the approved way to create a `role: "faculty"`
 * user without weakening firestore.rules.
 *
 * Never commit credentials. Authenticate with Application Default
 * Credentials (or GOOGLE_APPLICATION_CREDENTIALS pointing at a
 * service-account JSON that is kept outside the repository).
 *
 * Production usage:
 *   node scripts/create-faculty.js \
 *     --email teacher@example.edu --password "Str0ngPass1" \
 *     --name "Dr. Jane Doe" --phone 9876543210 \
 *     --department "Computer Science"
 *
 * Emulator usage (PowerShell):
 *   $env:FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
 *   $env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
 *   $env:GCLOUD_PROJECT="cloud-online-quiz-platform"
 *   node scripts/create-faculty.js --email t@example.edu --password "Str0ngPass1" --name "Dr. Jane"
 *
 * Password may also be supplied via the FACULTY_PASSWORD env var to
 * avoid it appearing in shell history.
 */

const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token.startsWith("--")) {
      const key = token.slice(2);
      const value = argv[i + 1];

      if (value === undefined || value.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = value;
        i += 1;
      }
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const email = String(args.email || process.env.FACULTY_EMAIL || "")
    .trim()
    .toLowerCase();
  const password = args.password || process.env.FACULTY_PASSWORD || "";
  const name = String(args.name || process.env.FACULTY_NAME || "").trim();
  const phone = String(args.phone || "").trim();
  const department = String(args.department || "").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid --email is required.");
  }

  if (!password || password.length < 6) {
    throw new Error("A --password of at least 6 characters is required.");
  }

  if (!name) {
    throw new Error("A --name is required.");
  }

  // initializeApp() auto-detects credentials:
  //  - the Auth/Firestore emulator env vars, or
  //  - Application Default Credentials / GOOGLE_APPLICATION_CREDENTIALS.
  initializeApp();

  const auth = getAuth();
  const db = getFirestore();

  let userRecord;

  try {
    userRecord = await auth.getUserByEmail(email);
    console.log(`Auth user already exists: ${userRecord.uid}`);
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw error;
    }

    userRecord = await auth.createUser({
      email,
      password,
      displayName: name
    });

    console.log(`Created Auth user: ${userRecord.uid}`);
  }

  const docRef = db.collection("users").doc(userRecord.uid);
  const existing = await docRef.get();

  const profile = {
    name,
    email,
    role: "faculty"
  };

  if (!existing.exists) {
    profile.createdAt = FieldValue.serverTimestamp();
  }

  if (phone) {
    profile.phone = phone.slice(0, 20);
  }

  if (department) {
    profile.department = department.slice(0, 80);
  }

  await docRef.set(profile, { merge: true });

  console.log("Faculty profile provisioned:");
  console.log(`  uid:        ${userRecord.uid}`);
  console.log(`  email:      ${email}`);
  console.log("  role:       faculty");
  console.log(`  name:       ${name}`);

  if (phone) {
    console.log(`  phone:      ${phone}`);
  }

  if (department) {
    console.log(`  department: ${department}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      "Failed to provision faculty account:",
      (error && error.message) || error
    );
    process.exit(1);
  });

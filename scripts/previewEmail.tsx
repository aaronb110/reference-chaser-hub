// Run with: npx tsx scripts/previewEmail.tsx
import fs from "fs";
import path from "path";
import { renderToStaticMarkup } from "react-dom/server";
import BaseLayout from "../src/emails/BaseLayout";
import React from "react";
import CandidateConsent from "../src/emails/CandidateConsent";

const html =
  "<!DOCTYPE html>" +
  renderToStaticMarkup(
    <CandidateConsent
      candidateName="Jamie"
      consentLink="https://app.refevo.com/add-referees/example-token"
      fallbackLink="https://app.refevo.com/add-referees"
      expiresAtRelative="in 48 hours"
      expiresAtAbsolute="24 Oct 2025 at 6:00 PM"
    />
  );


const out = path.join(process.cwd(), "preview.html");
fs.writeFileSync(out, html);
console.log("✅ Preview generated:", out);

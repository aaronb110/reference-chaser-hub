import * as React from "react";
import BaseLayout from "./BaseLayout";

export default function CandidateConsent({
  candidateName,
  consentLink,
  fallbackLink,
  expiresAtRelative,
  expiresAtAbsolute,
}: {
  candidateName: string;
  consentLink: string;
  fallbackLink: string;
  expiresAtRelative: string;
  expiresAtAbsolute: string;
}) {
  return (
    <BaseLayout>
      <h1 style={{ color: "#0A1A2F", marginTop: 0 }}>Please confirm your consent</h1>
      <p>Hi {candidateName},</p>
      <p>
        We’ve been asked to collect your employment references. Please confirm your consent to
        allow your referees to be contacted.
      </p>

      <p>
        <a href={consentLink}>Confirm consent</a>
      </p>

      <p style={{ color: "#64748B" }}>
        This link expires {expiresAtRelative} (by {expiresAtAbsolute}). If the button doesn’t work,
        you can also use this link: <a href={fallbackLink}>{fallbackLink}</a>
      </p>

      <hr style={{ border: "none", borderTop: "1px solid #E2E8F0", margin: "16px 0" }} />

      <p style={{ fontSize: "12px", color: "#64748B" }}>
        GDPR Notice: By confirming, you authorise your referees to share employment information for
        verification purposes only.
      </p>
    </BaseLayout>
  );
}

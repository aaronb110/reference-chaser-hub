import * as React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Link,
  Img,
  Hr,
} from "@react-email/components";

export default function InviteEmail({
  name,
  inviteLink,
  optOutLink,
  logoUrl,
}: {
  name: string;
  inviteLink: string;
  optOutLink: string;
  logoUrl?: string;
}) {
  const logo =
    logoUrl ||
    "https://refevo.com/logo-email.png"; // use your hosted logo here

  return (
    <Html>
      <Head />
      <Preview>Welcome to the Refevo Beta — your access is ready 🎉</Preview>
      <Body
        style={{
          margin: 0,
          padding: "0",
          backgroundColor: "#0F172A", // dark backdrop for header
          fontFamily:
            "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
        }}
      >
        {/* ---------------- HEADER ---------------- */}
        <Section
          style={{
            background:
              "linear-gradient(135deg, #0F172A 0%, #1E293B 70%, #334155 100%)",
            padding: "36px 0 28px",
            textAlign: "center",
          }}
        >
          <Img
            src={logo}
            alt="Refevo Logo"
            width="64"
            height="64"
            style={{
              margin: "0 auto 12px",
              display: "block",
              borderRadius: 12,
            }}
          />
          <Text
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              color: "#E2E8F0",
              letterSpacing: "0.3px",
            }}
          >
            Welcome to the Refevo Beta 🚀
          </Text>
        </Section>

        {/* ---------------- MAIN CARD ---------------- */}
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px 16px 0 0",
            padding: "40px 32px 28px",
            margin: "0 auto",
            maxWidth: 640,
          }}
        >
          <Text
            style={{
              margin: "0 0 18px",
              fontSize: 18,
              lineHeight: "26px",
              color: "#0F172A",
              fontWeight: 600,
            }}
          >
            Hi {name},
          </Text>

          <Text
            style={{
              margin: "0 0 22px",
              fontSize: 15.5,
              lineHeight: "25px",
              color: "#334155",
            }}
          >
            You’ve been selected to join our{" "}
            <strong>Founding Member Beta Programme</strong>.
            <br />
            This short testing phase helps recruiters like you shape Refevo
            before public launch — and unlock{" "}
            <strong>12 months of Pro access free</strong> plus{" "}
            <strong>50% off for life</strong>.
          </Text>

          {/* CTA */}
          <Section style={{ textAlign: "center", marginBottom: 30 }}>
            <Button
              href={inviteLink}
              style={{
                background:
                  "linear-gradient(90deg, #14B8A6 0%, #0EA5A6 100%)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 16,
                textDecoration: "none",
                borderRadius: 10,
                padding: "14px 26px",
                display: "inline-block",
                boxShadow: "0 3px 10px rgba(14,165,166,0.25)",
              }}
            >
              Activate My Beta Access
            </Button>
          </Section>

          <Section
            style={{
              backgroundColor: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              padding: "18px 20px",
              marginBottom: 30,
            }}
          >
            <Text
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: "24px",
                color: "#0F172A",
                fontWeight: 600,
              }}
            >
              What to expect
            </Text>
            <Text
              style={{
                margin: "8px 0 0",
                fontSize: 15,
                lineHeight: "24px",
                color: "#475569",
              }}
            >
              • 2–3 weeks of test access using sample data<br />
              • Then live reference requests once stable<br />
              • Short feedback sessions with our team<br />
              • Exclusive early access perks
            </Text>
          </Section>

          <Text
            style={{
              fontSize: 14,
              lineHeight: "22px",
              color: "#64748B",
              textAlign: "center",
            }}
          >
            Didn’t mean to sign up or changed your mind?{" "}
            <Link
              href={optOutLink}
              style={{
                color: "#0EA5A6",
                textDecoration: "underline",
              }}
            >
              Opt out here
            </Link>
            .
          </Text>

          <Hr
            style={{
              borderColor: "#E2E8F0",
              margin: "28px 0 16px",
            }}
          />

          <Text
            style={{
              margin: 0,
              fontSize: 12,
              color: "#94A3B8",
              textAlign: "center",
            }}
          >
            © {new Date().getFullYear()} Refevo • Built with recruiters, for
            recruiters.
            <br />
            <Link
              href="https://refevo.com"
              style={{ color: "#64748B", textDecoration: "none" }}
            >
              refevo.com
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

import * as React from "react";

export default function BaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body style={{ margin: 0, padding: 0, background: "#FFFFFF", color: "#1E293B", fontFamily: "Inter, Arial, sans-serif" }}>
        <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
          <tbody>
            <tr>
              <td align="center" style={{ background: "#0A1A2F", padding: "24px" }}>
                <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "20px" }}>Refevo</span>
              </td>
            </tr>
            <tr>
              <td align="center" style={{ padding: "24px" }}>
                <table width="600" style={{ border: "1px solid #E2E8F0", borderRadius: "12px" }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "24px" }}>
                        {children}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style={{ padding: "16px 24px 40px", color: "#64748B", fontSize: "12px" }}>
                Powered by Refevo – simple, secure reference checks.
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

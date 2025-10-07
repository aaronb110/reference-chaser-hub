export const getWelcomeEmailHtml = (name: string) => `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
    <h2 style="color:#0A2540;">🎉 Welcome to Refevo, ${name}!</h2>
    <p>We’re thrilled to have you as a <strong>Founding Member</strong>.</p>
    <p>
      We're currently finalising the Refevo platform and expect to open
      Founding Member beta access by <strong>mid-November 2025</strong>.
    </p>
    <p>You'll receive your invite and setup guide by email once we go live.</p>
    <hr style="border:none;border-top:1px solid #ddd;margin:24px 0"/>
    <p style="font-size:14px;color:#555">
      If you change your mind, you can
      <a href="\${process.env.SITE_URL}/api/optout?email=\${encodeURIComponent(name)}&token=\${process.env.OPT_OUT_SECRET}"
         style="color:#0A84FF;text-decoration:none;">opt out here</a>.
    </p>
    <p style="font-size:12px;color:#888">
      © ${new Date().getFullYear()} Refevo. All rights reserved.
    </p>
  </div>
`;

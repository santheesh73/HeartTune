# HeartTune Supabase Email Templates

Supabase sends Auth emails from its hosted Auth service, so the email copy and subject must be changed in the Supabase dashboard.

## Password Reset Link

HeartTune uses Supabase password recovery links for password reset. The app calls `supabase.auth.resetPasswordForEmail()`, so Supabase sends the email from the `Password Recovery` template.

If your email still says `Your sign-in link`, Supabase is sending the wrong/default template. Make sure the app is deployed with the current password reset route, then update the `Password Recovery` email template below.

Also make sure Supabase allows your reset URL under `Authentication` > `URL Configuration` > `Redirect URLs`, for example:

```text
https://your-domain.vercel.app/reset-password
http://localhost:3000
http://localhost:3000/**
http://localhost:3000/reset-password
```

If the reset URL is missing there, Supabase can reject the link or redirect to the wrong place.

## Steps To Get The Branded Reset Link

1. Open your Supabase project dashboard.
2. Go to `Authentication` > `Emails` > `Templates`.
3. Open `Password Recovery`.
4. Set the subject to:

```text
Reset your HeartTune password
```

5. Paste this exact body, or paste the contents of `password-recovery.html`:

```html
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222;line-height:1.6">
  <h1 style="margin:0 0 16px;color:#e11d48;font-size:28px">Reset your HeartTune password</h1>
  <p>This email is from the <strong>HeartTune music app</strong>. We received a request to reset the password for your HeartTune account.</p>
  <p>Choose a new password by clicking the HeartTune reset link below. For your security, use the newest reset email and ignore older reset links.</p>
  <p style="margin:28px 0">
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#e11d48;color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px">Reset HeartTune password</a>
  </p>
  <p style="font-size:14px;color:#555">If the button does not work, copy and paste this link into your browser:<br /><a href="{{ .ConfirmationURL }}" style="color:#e11d48;word-break:break-all">{{ .ConfirmationURL }}</a></p>
  <p style="font-size:14px;color:#555">If you did not request this reset, you can safely ignore this email. Your HeartTune password will not change unless this link is used.</p>
  <hr style="border:0;border-top:1px solid #eee;margin:28px 0" />
  <p style="font-size:12px;color:#777">HeartTune music app password reset email for {{ .Email }}.</p>
</div>
```

6. Save the template.
7. Go back to HeartTune and request a new password reset link. Old emails will not change.
8. Open the newest email. It should show `Reset your HeartTune password` and a `Reset HeartTune password` link.

The reset link is rendered by `{{ .ConfirmationURL }}`. Do not remove that variable from the Password Recovery template.

## Magic Link

The `Magic Link` template is not used for HeartTune password reset anymore. If you use passwordless login later, brand that template separately.

## Email Confirmation

For signup verification, open `Confirm signup` and set the subject to:

```text
Confirm your HeartTune email
```

Paste `email-confirmation.html` into the message body.

## Sender Name

The screenshot still shows `Supabase Auth` as the sender. To change that, configure custom SMTP in Supabase under `Authentication` > `Emails` > `SMTP Settings`, then set the sender name to:

```text
HeartTune
```

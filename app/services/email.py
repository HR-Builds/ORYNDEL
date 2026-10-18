import aiosmtplib
from email.message import EmailMessage
from app.config import settings


async def send_email(to: str, subject: str, html: str) -> None:
    msg = EmailMessage()
    msg["From"] = settings.MAIL_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content("This email requires an HTML-capable mail client.")
    msg.add_alternative(html, subtype="html")
    await aiosmtplib.send(
        msg,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER,
        password=settings.SMTP_PASSWORD,
        start_tls=True,
    )


async def send_otp_email(to: str, otp: str, purpose: str) -> None:
    if purpose == "verify_email":
        subject = "Verify your ORYNDEL account"
        heading = "Confirm your email address"
        text = "Enter the code below to activate your account. It expires in 10 minutes."
    else:
        subject = "Reset your ORYNDEL password"
        heading = "Password reset request"
        text = "Enter the code below to reset your password. It expires in 10 minutes."

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;border:1px solid #e5e5e5">
      <h2 style="margin:0 0 8px">{heading}</h2>
      <p style="color:#555">{text}</p>
      <div style="font-size:32px;letter-spacing:8px;font-weight:bold;padding:16px 0">{otp}</div>
      <p style="color:#999;font-size:12px">If you did not request this, ignore this email.</p>
    </div>
    """
    await send_email(to, subject, html)
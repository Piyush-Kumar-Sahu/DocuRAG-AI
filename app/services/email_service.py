import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Any, Tuple, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.mode = settings.EMAIL_MODE
        self.sent_emails: List[Dict[str, Any]] = []

    def _resolve_smtp_config(self) -> Tuple[str, int, str, str, str]:
        raw_host = (settings.EMAIL_HOST or "").strip()
        from_name = settings.PROJECT_NAME or "RAG Document Chat"

        if not raw_host:
            return ("localhost", 587, "noreply@ragdocchat.local", "noreply@ragdocchat.local", from_name)
        if "@" in raw_host:
            smtp_user = raw_host
            from_email = raw_host
            domain = raw_host.split("@", 1)[1].strip().lower()

            if domain in ["gmail.com", "googlemail.com"]:
                host = "smtp.gmail.com"
                port = 587
            elif domain in ["outlook.com", "hotmail.com", "live.com", "office365.com", "msn.com"]:
                host = "smtp-mail.outlook.com"
                port = 587
            elif domain in ["yahoo.com", "myyahoo.com", "ymail.com"]:
                host = "smtp.mail.yahoo.com"
                port = 587
            elif domain in ["zoho.com", "zohomail.com"]:
                host = "smtp.zoho.com"
                port = 587
            else:
                host = f"smtp.{domain}"
                port = 587
            return (host, port, smtp_user, from_email, from_name)

        if ":" in raw_host:
            parts = raw_host.split(":", 1)
            host = parts[0].strip()
            try:
                port = int(parts[1].strip())
            except ValueError:
                port = 587
        else:
            host = raw_host
            port = 587
        clean_domain = host.lower()
        if clean_domain.startswith("smtp."):
            clean_domain = clean_domain[5:]
        elif clean_domain.startswith("mail."):
            clean_domain = clean_domain[5:]

        if not clean_domain or clean_domain == "localhost" or "." not in clean_domain:
            clean_domain = "ragdocchat.local"

        from_email = f"noreply@{clean_domain}"
        smtp_user = self._derive_smtp_user(host, from_email)

        return (host, port, smtp_user, from_email, from_name)

    def _derive_smtp_user(self, host: str, from_email: str) -> str:
        host_lower = host.lower()
        if "resend.com" in host_lower:
            return "resend"
        if "sendgrid.net" in host_lower:
            return "apikey"
        if "mailgun.org" in host_lower:
            return "postmaster"
        return from_email

    def _parse_host_and_port(self) -> Tuple[str, int]:
        host, port, _, _, _ = self._resolve_smtp_config()
        return (host, port)

    def _derive_from_email_and_name(self, host: str) -> Tuple[str, str]:
        _, _, _, from_email, from_name = self._resolve_smtp_config()
        return (from_email, from_name)

    def send_otp_email(
        self,
        to_email: str,
        otp_code: str,
        purpose: str = "Email Verification",
        user_name: Optional[str] = None
    ) -> bool:
        host, port, smtp_user, from_email, from_name = self._resolve_smtp_config()
        greeting = f"Hello {user_name.strip()}," if user_name and user_name.strip() else "Hello,"
        subject = f"Your {purpose} Code - {from_name}"
        body_text = (
            f"{greeting}\n\n"
            f"Your one-time verification code for {purpose} is: {otp_code}\n\n"
            f"This code will expire in {settings.OTP_EXPIRE_MINUTES} minutes.\n"
            f"If you did not request this code, please ignore this email.\n\n"
            f"Regards,\n{from_name}"
        )

        if self.mode == "mock":
            self.sent_emails.append({
                "to": to_email,
                "purpose": purpose,
                "otp_code": otp_code,
                "subject": subject,
                "body": body_text,
                "user_name": user_name,
            })
            return True

        if self.mode == "console" or not (settings.EMAIL_HOST and settings.EMAIL_HOST.strip()):
            print(f"\n{'='*50}\n[DEV EMAIL - CONSOLE MODE]\nTo: {to_email}\nSubject: {subject}\nPurpose: {purpose}\nOTP: {otp_code}\n{'='*50}\n")
            return True

        clean_password = (settings.EMAIL_PASSWORD or "").strip()
        logger.info(f"SMTP host configured: yes ({host}:{port})")
        logger.info(f"Constructing OTP email message for recipient {to_email} ({purpose})")

        try:
            msg = MIMEMultipart()
            msg["From"] = f"{from_name} <{from_email}>"
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body_text, "plain"))
            logger.info("Email message construction: success")
        except Exception as msg_err:
            logger.error(f"Email message construction: failure ({type(msg_err).__name__}: {str(msg_err)})")
            return False

        server = None
        try:
            if port == 465:
                server = smtplib.SMTP_SSL(host, port, timeout=15)
            else:
                server = smtplib.SMTP(host, port, timeout=15)
                server.starttls()
            logger.info(f"SMTP connection: success ({host}:{port})")
            if clean_password:
                try:
                    server.login(smtp_user, clean_password)
                    logger.info(f"SMTP authentication: success (User: {smtp_user})")
                except smtplib.SMTPAuthenticationError as auth_err:
                    logger.error(
                        f"SMTP authentication: failure (Code: {auth_err.smtp_code}, Detail: {auth_err.smtp_error.decode('utf-8', errors='ignore') if isinstance(auth_err.smtp_error, bytes) else str(auth_err.smtp_error)})"
                    )
                    logger.error("OTP email send: failure (Authentication failed. Please verify that EMAIL_HOST and EMAIL_PASSWORD/App-Password are valid).")
                    return False

            server.send_message(msg)
            logger.info(f"OTP email send: success (Recipient: {to_email})")
            return True

        except smtplib.SMTPConnectError as conn_err:
            logger.error(f"SMTP connection: failure ({type(conn_err).__name__}: {str(conn_err)})")
            logger.error("OTP email send: failure (Could not establish connection to SMTP server).")
            return False
        except smtplib.SMTPException as smtp_err:
            logger.error(f"SMTP error occurred: {type(smtp_err).__name__}: {str(smtp_err)}")
            logger.error(f"OTP email send: failure ({str(smtp_err)})")
            return False
        except Exception as exc:
            logger.error(f"Unexpected email error: {type(exc).__name__}: {str(exc)}")
            logger.error(f"OTP email send: failure ({str(exc)})")
            return False
        finally:
            if server:
                try:
                    server.quit()
                except Exception:
                    pass

email_service = EmailService()

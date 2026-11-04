#!/usr/bin/env python3
"""Conservative public-repository secret scan. Prints paths/categories, NEVER secret values."""
import base64
import io
import os
from pathlib import Path
import re
import subprocess
import sys
import zipfile

MAX_MEMBER_BYTES = 12_000_000
MAX_ARCHIVE_BYTES = 100_000_000
TEXT_EXTS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".json", ".jsonc", ".sql",
             ".md", ".txt", ".yaml", ".yml", ".toml", ".sh", ".ps1", ".xml", ".html", ".css",
             ".ini", ".example", ".env"}
CREDENTIAL_NAMES = re.compile(r"(?:^|/)(?:\.env(?:\..+)?|.*(?:service.account|credentials)\.json|.*\.(?:pem|p12|pfx|key))$", re.I)
ENV_ASSIGNMENT = re.compile(r"(?m)^\s*(?:export\s+)?(SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL|DIRECT_URL|RESEND_API_KEY|VERCEL_TOKEN|CRON_SECRET|JWT_SECRET|CHECKOUT_RATE_LIMIT_SALT|SMTP_PASSWORD|POSTGRES_PASSWORD)\s*=\s*(\S+)\s*$", re.I)
RAW_KEY_PATTERNS = (
    ("private_key", re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----")),
    ("cloud_api_key", re.compile(r"(?<![A-Za-z0-9_])(?:sb_secret_|sk_live_|sk_proj_|ghp_|gho_|ghu_|ghs_|ghr_|github_pat_|AKIA|ASIA|xoxb-|xoxp-|xoxa-)[A-Za-z0-9_/-]{16,}")),
)
JWT = re.compile(r"\beyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{15,}\b")
PLACEHOLDER = re.compile(r"^(?:['\"]?)(?:TU_|YOUR_|CHANGE_ME|CHANGEME|GENERAR_|EXAMPLE|DUMMY|PLACEHOLDER|TEST_|<|\$\{)", re.I)
issues = []

def flag(path, category):
    if (path, category) not in issues:
        issues.append((path, category))

def is_credential_name(path):
    path = path.replace("\\", "/")
    if path.endswith((".env.example", ".env.sample", ".env.template")):
        return False
    return bool(CREDENTIAL_NAMES.search(path))

def is_text(path):
    name = Path(path).name.lower()
    return name.startswith(".env") or name in {".gitignore", ".npmrc"} or Path(name).suffix in TEXT_EXTS

def inspect_text(path, raw):
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        return
    for label, pattern in RAW_KEY_PATTERNS:
        if pattern.search(text):
            flag(path, label)
    for match in JWT.finditer(text):
        try:
            segment = match.group().split(".")[1]
            decoded = base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4))
            if re.search(rb'"role"\s*:\s*"service_role"', decoded):
                flag(path, "supabase_service_role_jwt")
                break
        except (ValueError, UnicodeError):
            pass
    for match in ENV_ASSIGNMENT.finditer(text):
        value = match.group(2).strip().strip("'\"")
        if value and not PLACEHOLDER.match(value):
            flag(path, "hardcoded_server_secret_assignment")

def inspect_file(path, raw, depth=0):
    if is_credential_name(path):
        flag(path, "sensitive_filename")
    if path.lower().endswith(".zip"):
        if depth >= 2:
            flag(path, "nested_archive_unchecked")
            return
        try:
            with zipfile.ZipFile(io.BytesIO(raw)) as zf:
                if sum(x.file_size for x in zf.infolist()) > MAX_ARCHIVE_BYTES:
                    flag(path, "archive_too_large_to_audit")
                    return
                for entry in zf.infolist():
                    if entry.is_dir():
                        continue
                    child = path + "!" + entry.filename.replace("\\", "/")
                    if entry.flag_bits & 1 or entry.file_size > MAX_MEMBER_BYTES:
                        flag(child, "encrypted_or_oversized_member")
                        continue
                    if is_credential_name(entry.filename):
                        flag(child, "sensitive_filename")
                    if is_text(entry.filename) or entry.filename.lower().endswith(".zip"):
                        with zf.open(entry) as stream:
                            inspect_file(child, stream.read(MAX_MEMBER_BYTES + 1), depth + 1)
        except (zipfile.BadZipFile, RuntimeError, OSError, ValueError):
            flag(path, "unreadable_archive")
    elif is_text(path) and len(raw) <= MAX_MEMBER_BYTES:
        inspect_text(path, raw)

def main():
    tracked = subprocess.check_output(["git", "ls-files", "-z"]).decode().split("\0")
    count = 0
    for file in tracked:
        if not file or not os.path.isfile(file):
            continue
        if not (file.lower().endswith(".zip") or is_text(file) or is_credential_name(file)):
            continue
        count += 1
        with open(file, "rb") as stream:
            raw = stream.read(MAX_ARCHIVE_BYTES + 1)
        if len(raw) > MAX_ARCHIVE_BYTES:
            flag(file, "file_too_large_to_audit")
            continue
        inspect_file(file, raw)
    if issues:
        for path, label in issues[:25]:
            print(f"[SECURITY] {label}: {path}", file=sys.stderr)
        print(f"Audit blocked: {len(issues)} findings. No secret values were printed.", file=sys.stderr)
        return 1
    print(f"Public-repository secret/archive scan passed ({count} files, including ZIP contents).")
    return 0

if __name__ == "__main__":
    sys.exit(main())

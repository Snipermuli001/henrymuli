#!/usr/bin/env python3
"""Henry Device Bridge: localhost-only, allowlisted ADB/Fastboot helper."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import json, os, secrets, shutil, subprocess, sys

HOST = "127.0.0.1"
PORT = 8765
ALLOWED_ORIGIN = "https://henrymuli.pages.dev"
APP_DIR = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "HenryDeviceBridge"
TOKEN_FILE = APP_DIR / "token.txt"

def get_token():
    APP_DIR.mkdir(parents=True, exist_ok=True)
    if TOKEN_FILE.exists():
        token = TOKEN_FILE.read_text(encoding="utf-8").strip()
        if len(token) >= 32:
            return token
    token = secrets.token_urlsafe(36)
    TOKEN_FILE.write_text(token, encoding="utf-8")
    try:
        os.chmod(TOKEN_FILE, 0o600)
    except OSError:
        pass
    return token

TOKEN = get_token()
BASE = Path(sys.executable).resolve().parent if getattr(sys, "frozen", False) else Path(__file__).resolve().parent

def locate_tool(name):
    exe = name + (".exe" if os.name == "nt" else "")
    candidates = [BASE / "platform-tools" / exe, BASE / exe]
    for candidate in candidates:
        if candidate.is_file():
            return str(candidate)
    return shutil.which(exe)

def run_tool(name, args, timeout=15):
    path = locate_tool(name)
    if not path:
        return {"ok": False, "error": f"{name} not found. Install Google Platform Tools or place them in the platform-tools folder."}
    try:
        p = subprocess.run([path, *args], capture_output=True, text=True, timeout=timeout, shell=False,
                           creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        return {"ok": p.returncode == 0, "output": (p.stdout or p.stderr).strip(), "exit_code": p.returncode}
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "Command timed out."}
    except OSError as exc:
        return {"ok": False, "error": str(exc)}

def valid_serial(value):
    return bool(value) and len(value) <= 100 and all(c.isalnum() or c in "._:-" for c in value)

class Handler(BaseHTTPRequestHandler):
    server_version = "HenryDeviceBridge/0.1"
    def log_message(self, fmt, *args):
        print("[Henry Bridge] " + (fmt % args))

    def send_json(self, code, payload):
        raw = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        if self.headers.get("Origin") != ALLOWED_ORIGIN:
            return self.send_json(403, {"ok": False, "error": "Origin not allowed"})
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def authorized(self):
        return (self.headers.get("Origin") == ALLOWED_ORIGIN and
                secrets.compare_digest(self.headers.get("Authorization", ""), "Bearer " + TOKEN))

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            return self.send_json(200, {"ok": True, "service": "Henry Device Bridge", "version": "0.1"})
        if not self.authorized():
            return self.send_json(403, {"ok": False, "error": "Open Project Henry and enter your local bridge token."})
        if parsed.path == "/api/devices":
            return self.send_json(200, run_tool("adb", ["devices", "-l"]))
        if parsed.path == "/api/fastboot":
            return self.send_json(200, run_tool("fastboot", ["devices", "-l"]))
        if parsed.path == "/api/device-info":
            serial = parse_qs(parsed.query).get("serial", [""])[0]
            if not valid_serial(serial):
                return self.send_json(400, {"ok": False, "error": "A valid device serial is required."})
            results = {}
            for key, prop in [("manufacturer","ro.product.manufacturer"),("model","ro.product.model"),
                              ("device","ro.product.device"),("android","ro.build.version.release"),
                              ("build","ro.build.display.id"),("chipset","ro.hardware")]:
                results[key] = run_tool("adb", ["-s", serial, "shell", "getprop", prop]).get("output", "")
            return self.send_json(200, {"ok": True, "serial": serial, "info": results})
        return self.send_json(404, {"ok": False, "error": "Unknown endpoint."})

    def do_POST(self):
        if not self.authorized():
            return self.send_json(403, {"ok": False, "error": "Not authorized. Check the bridge token and website origin."})
        parsed = urlparse(self.path)
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size > 4096:
                return self.send_json(413, {"ok": False, "error": "Request too large."})
            data = json.loads(self.rfile.read(size) or b"{}")
        except (ValueError, json.JSONDecodeError):
            return self.send_json(400, {"ok": False, "error": "Invalid request."})
        serial = data.get("serial", "")
        if not valid_serial(serial):
            return self.send_json(400, {"ok": False, "error": "A valid device serial is required."})
        if parsed.path == "/api/reboot":
            result = run_tool("adb", ["-s", serial, "reboot"])
        elif parsed.path == "/api/recovery":
            result = run_tool("adb", ["-s", serial, "reboot", "recovery"])
        else:
            return self.send_json(404, {"ok": False, "error": "Unknown endpoint."})
        return self.send_json(200 if result.get("ok") else 400, result)

if __name__ == "__main__":
    print("Henry Device Bridge is running on http://127.0.0.1:8765")
    print("Local pairing token (keep private): " + TOKEN)
    print("Only Project Henry's official website origin is accepted.")
    try:
        ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
    except OSError as exc:
        print("Could not start bridge:", exc)
        input("Press Enter to close...")

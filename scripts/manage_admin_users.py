#!/usr/bin/env python3
"""Manage admin username/password records in Firestore.

This script stores admin users in the `adminUsers` collection using PBKDF2 hashes
compatible with the browser-side verifier in `js/admin.js`.

Examples:
  python scripts/manage_admin_users.py
  python scripts/manage_admin_users.py interactive
  python scripts/manage_admin_users.py init
  python scripts/manage_admin_users.py add owner SuperStrongPassword123!
  python scripts/manage_admin_users.py set-password owner NewPassword456!
  python scripts/manage_admin_users.py deactivate owner
  python scripts/manage_admin_users.py remove owner --yes
  python scripts/manage_admin_users.py list
"""

from __future__ import annotations

import argparse
import base64
import getpass
import hashlib
import os
import secrets
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except Exception as exc:  # pragma: no cover - import guard for runtime setup
    print(
        "ERROR: firebase-admin is required. Install it with: pip install firebase-admin",
        file=sys.stderr,
    )
    raise


DEFAULT_KEY_PATH = Path("server") / "firebase-admin-key.json"
DEFAULT_COLLECTION = "adminUsers"
DEFAULT_ITERATIONS = 210_000


@dataclass
class RuntimeConfig:
    key_path: Path
    collection: str
    iterations: int


def normalize_username(username: str) -> str:
    value = (username or "").strip().lower()
    if not value:
        raise ValueError("Username is required.")
    return value


def digest_to_hash_name(digest: str) -> str:
    cleaned = str(digest or "").strip().upper()
    if cleaned != "SHA-256":
        raise ValueError("Only SHA-256 is supported.")
    return "sha256"


def hash_password(password: str, *, iterations: int, digest: str = "SHA-256") -> Dict[str, Any]:
    if not password:
        raise ValueError("Password is required.")

    hash_name = digest_to_hash_name(digest)
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac(hash_name, password.encode("utf-8"), salt, iterations, dklen=32)
    return {
        "passwordHash": base64.b64encode(derived).decode("ascii"),
        "passwordSalt": base64.b64encode(salt).decode("ascii"),
        "iterations": iterations,
        "digest": digest,
    }


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def resolve_key_path(raw_path: str | None) -> Path:
    env_path = os.environ.get("FIREBASE_ADMIN_KEY_PATH", "").strip()
    candidate = Path(raw_path or env_path or DEFAULT_KEY_PATH)
    return candidate.resolve()


def init_firestore(key_path: Path):
    if not key_path.exists():
        raise FileNotFoundError(
            f"Service-account key not found: {key_path}\n"
            "Provide --key-path or set FIREBASE_ADMIN_KEY_PATH."
        )

    app = None
    for existing in firebase_admin._apps.values():  # type: ignore[attr-defined]
        app = existing
        break

    if app is None:
        cred = credentials.Certificate(str(key_path))
        app = firebase_admin.initialize_app(cred)

    return firestore.client(app=app)


def get_collection(db, name: str):
    return db.collection(name)


def prompt_non_empty(prompt: str) -> str:
    while True:
        value = input(prompt).strip()
        if value:
            return value
        print("Value is required.")


def prompt_yes_no(prompt: str, *, default: bool = False) -> bool:
    suffix = " [Y/n]: " if default else " [y/N]: "
    while True:
        raw = input(prompt + suffix).strip().lower()
        if not raw:
            return default
        if raw in {"y", "yes"}:
            return True
        if raw in {"n", "no"}:
            return False
        print("Please answer y or n.")


def prompt_password_twice(label: str = "Password") -> str:
    while True:
        first = getpass.getpass(f"{label}: ")
        if not first:
            print("Password is required.")
            continue
        second = getpass.getpass(f"{label} (confirm): ")
        if first != second:
            print("Passwords do not match. Try again.")
            continue
        return first


def cmd_init(db, cfg: RuntimeConfig, args: argparse.Namespace) -> int:
    print(f"Connected to Firestore using key: {cfg.key_path}")
    print(f"Admin user table (collection): {cfg.collection}")
    print("Collection is ready.")

    if args.username:
        password = args.password or getpass.getpass("Password for initial user: ")
        return cmd_add(db, cfg, argparse.Namespace(
            username=args.username,
            password=password,
            active=True,
            overwrite=False,
        ))

    return 0


def cmd_add(db, cfg: RuntimeConfig, args: argparse.Namespace) -> int:
    username_key = normalize_username(args.username)
    password = args.password or getpass.getpass("Password: ")
    doc_ref = get_collection(db, cfg.collection).document(username_key)
    snapshot = doc_ref.get()

    if snapshot.exists and not bool(args.overwrite):
        print(f"ERROR: User '{username_key}' already exists. Use --overwrite to replace.", file=sys.stderr)
        return 1

    hashed = hash_password(password, iterations=cfg.iterations, digest="SHA-256")
    payload: Dict[str, Any] = {
        "username": username_key,
        "isActive": bool(args.active),
        "updatedAt": firestore.SERVER_TIMESTAMP,
        "updatedAtIso": now_iso(),
        **hashed,
    }

    if not snapshot.exists:
        payload["createdAt"] = firestore.SERVER_TIMESTAMP
        payload["createdAtIso"] = now_iso()

    doc_ref.set(payload, merge=snapshot.exists)
    action = "Updated" if snapshot.exists else "Created"
    print(f"{action} admin user: {username_key}")
    return 0


def cmd_remove(db, cfg: RuntimeConfig, args: argparse.Namespace) -> int:
    username_key = normalize_username(args.username)
    doc_ref = get_collection(db, cfg.collection).document(username_key)
    snapshot = doc_ref.get()

    if not snapshot.exists:
        print(f"User '{username_key}' does not exist.")
        return 0

    if not args.yes:
        confirm = input(f"Delete '{username_key}'? Type DELETE to confirm: ").strip()
        if confirm != "DELETE":
            print("Cancelled.")
            return 1

    doc_ref.delete()
    print(f"Deleted admin user: {username_key}")
    return 0


def cmd_set_password(db, cfg: RuntimeConfig, args: argparse.Namespace) -> int:
    username_key = normalize_username(args.username)
    doc_ref = get_collection(db, cfg.collection).document(username_key)
    snapshot = doc_ref.get()

    if not snapshot.exists:
        print(f"ERROR: User '{username_key}' not found.", file=sys.stderr)
        return 1

    password = args.password or getpass.getpass("New password: ")
    hashed = hash_password(password, iterations=cfg.iterations, digest="SHA-256")

    doc_ref.set(
        {
            **hashed,
            "updatedAt": firestore.SERVER_TIMESTAMP,
            "updatedAtIso": now_iso(),
        },
        merge=True,
    )
    print(f"Password updated for: {username_key}")
    return 0


def cmd_set_active(db, cfg: RuntimeConfig, args: argparse.Namespace, *, is_active: bool) -> int:
    username_key = normalize_username(args.username)
    doc_ref = get_collection(db, cfg.collection).document(username_key)
    snapshot = doc_ref.get()

    if not snapshot.exists:
        print(f"ERROR: User '{username_key}' not found.", file=sys.stderr)
        return 1

    doc_ref.set(
        {
            "isActive": is_active,
            "updatedAt": firestore.SERVER_TIMESTAMP,
            "updatedAtIso": now_iso(),
        },
        merge=True,
    )
    state = "activated" if is_active else "deactivated"
    print(f"User '{username_key}' {state}.")
    return 0


def run_interactive_wizard(db, cfg: RuntimeConfig) -> int:
    print("")
    print("Admin User Manager (interactive mode)")
    print(f"Key: {cfg.key_path}")
    print(f"Collection: {cfg.collection}")
    print("")

    menu = [
        ("1", "List users"),
        ("2", "Add user"),
        ("3", "Change user password"),
        ("4", "Activate user"),
        ("5", "Deactivate user"),
        ("6", "Remove user"),
        ("7", "Verify connection (init)"),
        ("0", "Exit"),
    ]

    while True:
        print("\nChoose an action:")
        for key, label in menu:
            print(f"  {key}) {label}")

        choice = input("> ").strip()

        if choice == "0":
            print("Done.")
            return 0

        if choice == "1":
            cmd_list(db, cfg, argparse.Namespace(as_json=False))
            continue

        if choice == "2":
            username = prompt_non_empty("Username: ")
            active = prompt_yes_no("Should this user be active?", default=True)
            overwrite = prompt_yes_no("Overwrite if user already exists?", default=False)
            password = prompt_password_twice("Password")
            cmd_add(
                db,
                cfg,
                argparse.Namespace(
                    username=username,
                    password=password,
                    active=active,
                    overwrite=overwrite,
                ),
            )
            continue

        if choice == "3":
            username = prompt_non_empty("Username: ")
            password = prompt_password_twice("New password")
            cmd_set_password(
                db,
                cfg,
                argparse.Namespace(
                    username=username,
                    password=password,
                ),
            )
            continue

        if choice == "4":
            username = prompt_non_empty("Username: ")
            cmd_set_active(db, cfg, argparse.Namespace(username=username), is_active=True)
            continue

        if choice == "5":
            username = prompt_non_empty("Username: ")
            cmd_set_active(db, cfg, argparse.Namespace(username=username), is_active=False)
            continue

        if choice == "6":
            username = prompt_non_empty("Username: ")
            yes = prompt_yes_no("Delete this user now?", default=False)
            cmd_remove(db, cfg, argparse.Namespace(username=username, yes=yes))
            continue

        if choice == "7":
            cmd_init(db, cfg, argparse.Namespace(username=None, password=None))
            continue

        print("Invalid selection. Enter one of the listed numbers.")


def cmd_list(db, cfg: RuntimeConfig, args: argparse.Namespace) -> int:
    rows = []
    for doc in get_collection(db, cfg.collection).stream():
        data = doc.to_dict() or {}
        rows.append(
            {
                "docId": doc.id,
                "username": str(data.get("username") or doc.id),
                "isActive": bool(data.get("isActive", True)),
                "updatedAtIso": str(data.get("updatedAtIso") or ""),
                "createdAtIso": str(data.get("createdAtIso") or ""),
            }
        )

    rows.sort(key=lambda item: item["username"])
    if not rows:
        print("No admin users found.")
        return 0

    if args.as_json:
        import json

        print(json.dumps(rows, indent=2))
        return 0

    print(f"Found {len(rows)} admin user(s):")
    print("-" * 78)
    print(f"{'Username':<22} {'Active':<8} {'Updated (UTC)':<24} {'Created (UTC)':<24}")
    print("-" * 78)
    for row in rows:
        print(
            f"{row['username']:<22} {str(row['isActive']):<8} "
            f"{row['updatedAtIso']:<24} {row['createdAtIso']:<24}"
        )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Manage Firestore adminUsers table")
    parser.add_argument(
        "--key-path",
        default=None,
        help=(
            "Path to Firebase service-account JSON. "
            "Default: FIREBASE_ADMIN_KEY_PATH or server/firebase-admin-key.json"
        ),
    )
    parser.add_argument(
        "--collection",
        default=DEFAULT_COLLECTION,
        help=f"Firestore collection name (default: {DEFAULT_COLLECTION})",
    )
    parser.add_argument(
        "--iterations",
        type=int,
        default=DEFAULT_ITERATIONS,
        help=f"PBKDF2 iterations for stored passwords (default: {DEFAULT_ITERATIONS})",
    )

    sub = parser.add_subparsers(dest="command")

    p_init = sub.add_parser("init", help="Verify Firestore access and optionally create first user")
    p_init.add_argument("username", nargs="?", help="Optional username to create immediately")
    p_init.add_argument("password", nargs="?", help="Optional password for initial username")

    p_add = sub.add_parser("add", help="Add a new admin user")
    p_add.add_argument("username")
    p_add.add_argument("password", nargs="?", help="If omitted, prompt securely")
    p_add.add_argument("--inactive", dest="active", action="store_false", help="Create user as inactive")
    p_add.add_argument("--overwrite", action="store_true", help="Overwrite if user already exists")
    p_add.set_defaults(active=True)

    p_remove = sub.add_parser("remove", help="Remove an admin user")
    p_remove.add_argument("username")
    p_remove.add_argument("--yes", action="store_true", help="Skip deletion confirmation")

    p_set = sub.add_parser("set-password", help="Change password for an existing user")
    p_set.add_argument("username")
    p_set.add_argument("password", nargs="?", help="If omitted, prompt securely")

    p_activate = sub.add_parser("activate", help="Activate an admin user")
    p_activate.add_argument("username")

    p_deactivate = sub.add_parser("deactivate", help="Deactivate an admin user")
    p_deactivate.add_argument("username")

    p_list = sub.add_parser("list", help="List admin users")
    p_list.add_argument("--json", dest="as_json", action="store_true", help="Print JSON output")

    sub.add_parser("interactive", help="Run guided interactive wizard")

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    key_path = resolve_key_path(args.key_path)
    cfg = RuntimeConfig(
        key_path=key_path,
        collection=str(args.collection or DEFAULT_COLLECTION).strip() or DEFAULT_COLLECTION,
        iterations=int(args.iterations or DEFAULT_ITERATIONS),
    )

    if cfg.iterations < 100_000:
        print("ERROR: --iterations must be at least 100000.", file=sys.stderr)
        return 1

    db = init_firestore(cfg.key_path)

    if args.command is None or args.command == "interactive":
        return run_interactive_wizard(db, cfg)
    if args.command == "init":
        return cmd_init(db, cfg, args)
    if args.command == "add":
        return cmd_add(db, cfg, args)
    if args.command == "remove":
        return cmd_remove(db, cfg, args)
    if args.command == "set-password":
        return cmd_set_password(db, cfg, args)
    if args.command == "activate":
        return cmd_set_active(db, cfg, args, is_active=True)
    if args.command == "deactivate":
        return cmd_set_active(db, cfg, args, is_active=False)
    if args.command == "list":
        return cmd_list(db, cfg, args)

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

"use client";

import { FormEvent, useState } from "react";
import styles from "./page.module.css";

export default function SetPasswordPage() {
  const [token, setToken] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const cleanToken = extractToken(token);
    if (!cleanToken) return setMessage("Paste the invite token or the full setup link.");
    if (password.length < 8) return setMessage("Password must contain at least 8 characters.");
    if (password !== confirm) return setMessage("Passwords do not match.");
    setLoading(true);
    const response = await fetch("/api/admin-users/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: cleanToken, password }),
    });
    const result = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) return setMessage(result?.error ?? "Unable to set password.");
    setDone(true);
  };

  return <main className={styles.shell}><section className={styles.panel}><div className={styles.brand}><span>C</span><div><strong>Carter&apos;s</strong><small>Admin Studio</small></div></div>{done ? <><h1>Password ready</h1><p>Your admin password was saved. You can now sign in with your email.</p><a href="/login">Go to login</a></> : <><p className={styles.eyebrow}>Member setup</p><h1>Choose your password</h1><p>Use this secure invite link to finish your Carter&apos;s admin account.</p><form onSubmit={submit}><label>Invite token or setup link<input value={token} onChange={event=>setToken(event.target.value)} placeholder="Paste the setup link here" autoComplete="off"/></label><label>Password<input type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete="new-password"/></label><label>Confirm password<input type="password" value={confirm} onChange={event=>setConfirm(event.target.value)} autoComplete="new-password"/></label>{message&&<p className={styles.error}>{message}</p>}<button disabled={loading}>{loading?"Saving...":"Set password"}</button></form></>}</section></main>;
}

function extractToken(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    return url.searchParams.get("token") ?? "";
  } catch {
    return trimmed;
  }
}

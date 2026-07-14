"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import styles from "./page.module.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setMessage(result?.error ?? "Unable to sign in");
      setLoading(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    window.location.href = params.get("next") || "/";
  };

  return (
    <main className={styles.loginShell}>
      <section className={styles.loginPanel}>
        <div className={styles.brand}>
          <Image className={styles.brandLogo} src="/carters-logo.png" alt="Carter's and OshKosh B'gosh" width={306} height={91} priority />
        </div>

        <div className={styles.copy}>
          <p>Admin access</p>
          <h1>Sign in to manage the mobile app</h1>
        </div>

        <form className={styles.form} onSubmit={login}>
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </label>

          {message && <p className={styles.error}>{message}</p>}
          <button disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
          <small className={styles.hint}>Use your administrator credentials. Sessions expire automatically.</small>
        </form>
      </section>
    </main>
  );
}

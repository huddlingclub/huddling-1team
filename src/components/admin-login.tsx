"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: form.get("id"), password: form.get("password") }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push("/admin"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "다시 시도해 주세요."); setBusy(false); }
  }
  return <div style={{ marginTop: 40 }}>
    {!open ? <button type="button" onClick={() => setOpen(true)} style={{ padding: 0, background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, fontWeight: 400 }}>운영진이에요</button> :
      <form onSubmit={submit} className="stack">
        <label>아이디<input name="id" value={id} readOnly /></label>
        <label>비밀번호<input name="password" type="password" autoComplete="current-password" required /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={busy}>{busy ? "확인 중..." : "들어가기"}</button>
      </form>}
  </div>;
}

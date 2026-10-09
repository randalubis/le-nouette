"use client";

import { useState, useTransition } from "react";
import { saveSettingsAction } from "@/lib/domain/invoice-actions";
import styles from "./founder.module.css";
import s from "./invoice.module.css";

type Text = { name: string; phone: string; email: string; address: string; instagram: string; paymentInfo: string; footerNote: string; signatureName: string };

export function SettingsForm({ initial, logoSrc }: { initial: Text; logoSrc: string | null }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [fileName, setFileName] = useState("");
  const submit = (form: FormData) => start(async () => {
    const res = await saveSettingsAction(form);
    setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: "Pengaturan tersimpan." });
  });
  const f = (key: keyof Text, label: string, multi = false, hint?: string, placeholder?: string) => (
    <label className={s.field}>{label}
      {multi ? <textarea name={key} defaultValue={initial[key]} placeholder={placeholder} /> : <input name={key} defaultValue={initial[key]} placeholder={placeholder} />}
      {hint && <small>{hint}</small>}
    </label>
  );
  return (
    <section className={styles.panel}>
      <form action={submit} className={`${s.form} ${s.formWide}`}>
        {f("name", "Nama perusahaan")}
        <div className={s.contactRow}>{f("phone", "Telepon", false, undefined, "[nomor telepon]")}{f("email", "Email", false, undefined, "[email]")}{f("instagram", "Instagram", false, undefined, "[akun Instagram]")}</div>
        {f("address", "Alamat", true, undefined, "[alamat lengkap]")}
        {f("paymentInfo", "Informasi pembayaran", true, "Contoh: nama bank, nomor rekening, atas nama.", "[bank, nomor rekening, atas nama]")}
        {f("footerNote", "Catatan / promo default", true)}
        {f("signatureName", "Nama penanda tangan", false, undefined, "[nama penanda tangan]")}
        <label className={s.field}>Logo (PNG atau JPG, maks. 500 KB)
          <span className={s.logoRow}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logoSrc ? <img className={s.logo} src={logoSrc} alt="Logo saat ini" width={72} height={72} /> : <span className={s.logoPlaceholder} aria-hidden="true">LN</span>}
            <span className={s.filePick}>
              <input className={s.fileInput} type="file" name="logo" accept="image/png,image/jpeg" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
              <span className={`btn btn-quiet ${s.fileBtn}`} aria-hidden="true">Pilih berkas</span>
              <span className={s.fileName}>{fileName || "Belum ada berkas dipilih"}</span>
            </span>
          </span>
        </label>
        {logoSrc && <label className={`${s.field} ${s.check}`}><input type="checkbox" name="removeLogo" /><span className={s.box} aria-hidden="true" />Hapus logo</label>}
        {msg && <p role="alert" className={msg.ok ? s.ok : s.error}>{msg.text}</p>}
        <button className="btn btn-primary" disabled={pending}>{pending ? "Menyimpan..." : "Simpan"}</button>
      </form>
    </section>
  );
}

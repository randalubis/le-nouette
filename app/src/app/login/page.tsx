import { loginAction } from "@/lib/domain/auth-actions";
import styles from "./login.module.css";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className={styles.page}>
      <form className={styles.card} action={loginAction}>
        <span className="brand-wordmark">LE NOUETTE</span>
        <h1>Founder OS</h1>
        <p>Masuk untuk mengakses panel operasional.</p>
        {error ? <div className={styles.error}>Email atau kata sandi salah.</div> : null}
        <label>
          Email
          <input type="email" name="email" autoComplete="username" required autoFocus />
        </label>
        <label>
          Kata sandi
          <input type="password" name="password" autoComplete="current-password" required />
        </label>
        <button type="submit" className="btn btn-primary">Masuk</button>
      </form>
    </main>
  );
}

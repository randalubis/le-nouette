import styles from "@/components/founder.module.css";

export default function Loading() {
  return (
    <div className={`${styles.app} ${styles.routeState}`} role="status" aria-busy="true">
      <div className={`${styles.panel} ${styles.routeCard}`}>
        <span className="sr-only">Memuat…</span>
        <div className={styles.skelLine} style={{ width: "40%" }} />
        <div className={styles.skelBlock} />
        <div className={styles.skelBlock} />
      </div>
    </div>
  );
}

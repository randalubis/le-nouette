import styles from "./action-card.module.css";

export function ActionCard({
  title,
  subtitle,
  headerAction,
  children,
  note,
  tone = "light",
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  note?: React.ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <div className={`${styles.panel} ${tone === "dark" ? styles.dark : ""}`}>
      <div className={styles.header}>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {headerAction}
      </div>
      <div className={styles.actions}>{children}</div>
      {note && <p className={styles.note}>{note}</p>}
    </div>
  );
}

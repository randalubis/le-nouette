import styles from "./action-card.module.css";

export function ActionCard({
  title,
  subtitle,
  headerAction,
  children,
  note,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <div className={styles.panel}>
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

"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, MapPin, Minus, Plus, QrCode, ShoppingBag, Storefront as StoreIcon, Truck, WhatsappLogo, type Icon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { formatRupiah, products, type ProductId } from "@/lib/domain/catalog";
import type { Fulfillment, Order, State } from "@/lib/domain/operations";
import { createOrderAction } from "@/lib/domain/actions";
import { formatDate, promisedReadyDate } from "@/lib/domain/schedule";
import { useTranslation, type Key } from "@/lib/i18n";
import { readRemembered, saveRemembered } from "@/lib/remembered";
import styles from "./storefront.module.css";

type Step = "shop" | "details" | "success";
type Option = { id: Fulfillment; title: Key; sub: Key; icon: Icon };

const productImage: Record<ProductId, string> = { milieu: "/le-nouette/milieu.png", grande: "/le-nouette/grande.png" };

const fulfillmentOptions: Option[] = [
  { id: "PICKUP_MANDIRI", title: "pickupMandiri", sub: "free", icon: StoreIcon },
  { id: "PICKUP_BI", title: "pickupBi", sub: "free", icon: StoreIcon },
  { id: "DELIVERY", title: "delivery", sub: "deliveryFee", icon: Truck },
];

export function Storefront({ session }: { session: State }) {
  const { t, locale, setLocale } = useTranslation();
  const [step, setStep] = useState<Step>("shop");
  const [qty, setQty] = useState<Record<ProductId, number>>({ milieu: 1, grande: 0 });
  const [fulfillment, setFulfillment] = useState<Fulfillment>("PICKUP_MANDIRI");
  const [remembered] = useState(() => (typeof window === "undefined" ? null : readRemembered()));
  const [form, setForm] = useState({ name: remembered?.name ?? "", whatsapp: remembered?.whatsapp ?? "", address: "", note: "" });
  const [remember, setRemember] = useState(remembered !== null);
  const [placed, setPlaced] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQris, setShowQris] = useState(false);
  const [pending, startTransition] = useTransition();

  const total = products.reduce((sum, product) => sum + product.price * qty[product.id], 0);
  const count = qty.milieu + qty.grande;
  const paused = session.storeStatus === "PAUSED";
  const readyLabel = formatDate(promisedReadyDate(new Date(), session.calendar), "long", locale);
  const placedQty = { milieu: 0, grande: 0, ...Object.fromEntries((placed?.items ?? []).map((item) => [item.productId, item.quantity])) } as Record<ProductId, number>;

  const updateQty = (id: ProductId, delta: number) => setQty((current) => ({ ...current, [id]: Math.max(0, current[id] + delta) }));
  const field = (key: keyof typeof form) => ({ value: form[key], onChange: (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value })) });

  const toggleRemember = (checked: boolean) => {
    setRemember(checked);
    if (!checked) saveRemembered(null);
  };

  const submit = () => {
    startTransition(async () => {
      const key = crypto.randomUUID();
      const { error, order } = await createOrderAction({ idempotencyKey: key, ...form, fulfillment, quantities: qty });
      setError(error);
      if (error || !order) return;
      saveRemembered(remember ? { name: form.name.trim(), whatsapp: form.whatsapp.replace(/[\s-]/g, "") } : null);
      setPlaced(order);
      setStep("success");
    });
  };

  const startOver = () => {
    setQty({ milieu: 1, grande: 0 });
    setForm((current) => ({ ...current, address: "", note: "" }));
    setPlaced(null);
    setShowQris(false);
    setStep("shop");
  };

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        {step === "details" ? <button className={styles.back} aria-label={t("back")} onClick={() => setStep("shop")}><ArrowLeft size={20} /></button> : <span />}
        <Link href="/" className={styles.wordmark}>LE NOUETTE</Link>
        <div className={styles.locale} role="group" aria-label={t("langSwitch")}>
          {(["ID", "EN"] as const).map((option) => (
            <button key={option} aria-pressed={locale === option} className={locale === option ? styles.localeActive : ""} onClick={() => setLocale(option)}>{option}</button>
          ))}
        </div>
      </header>

      {step === "shop" && (
        <>
          <section className={`${styles.hero} fade-up`}>
            <Image src="/le-nouette/hero.png" alt="Le Nouette cheese sticks" fill priority sizes="(max-width: 760px) 100vw, 760px" />
            <div className={styles.heroShade} />
            <div className={styles.heroCopy}>
              <p>{t("eyebrow")}</p>
              <h1 className="display">{t("heroTitle")}</h1>
              <span>{t("heroSub")}</span>
            </div>
          </section>

          <section className={`${styles.catalog} fade-up-delay`} aria-labelledby="products-title">
            <div className={styles.promise}>
              {paused ? <><span>{t("pausedTitle")}</span><strong>{t("pausedSub")}</strong></> : <><span>{t("openForOrders")}</span><strong>{t("readyEstimate", { date: readyLabel })}</strong></>}
            </div>
            <h2 id="products-title" className="display">{t("catalogTitle")}</h2>
            {products.map((product, index) => (
              <article className={styles.product} key={product.id}>
                <div className={`${styles.productVisual} ${index === 1 ? styles.pouchVisual : ""}`}>
                  <Image src={productImage[product.id]} alt={`${product.name} ${t(`${product.id}Detail`)}`} fill sizes="120px" />
                </div>
                <div className={styles.productCopy}>
                  <h3 className="display">{product.name}</h3>
                  <p className={styles.detail}>{t(`${product.id}Detail`)}</p>
                  <p>{t(`${product.id}Blurb`)}</p>
                  <strong>{formatRupiah(product.price)}</strong>
                </div>
                <div className={styles.stepper} role="group" aria-label={t("quantityOf", { product: product.name })}>
                  <button onClick={() => updateQty(product.id, -1)} disabled={qty[product.id] === 0} aria-disabled={qty[product.id] === 0} aria-label={t("decrease", { product: product.name })}><Minus size={16} /></button>
                  <span
                    role="spinbutton"
                    tabIndex={0}
                    aria-valuenow={qty[product.id]}
                    aria-valuemin={0}
                    aria-valuemax={99}
                    aria-live="polite"
                    onKeyDown={(event) => {
                      if (event.key === "ArrowUp") { event.preventDefault(); updateQty(product.id, 1); }
                      if (event.key === "ArrowDown") { event.preventDefault(); updateQty(product.id, -1); }
                    }}
                  >{qty[product.id]}</span>
                  <button className={styles.plus} onClick={() => updateQty(product.id, 1)} aria-label={t("increase", { product: product.name })}><Plus size={16} /></button>
                </div>
              </article>
            ))}
          </section>
        </>
      )}

      {step === "details" && (
        <form id="checkout" className={`${styles.formPage} fade-up`} onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <div className={styles.pageIntro}>
            <span>{t("yourOrder")}</span>
            <h1 className="display">{t("fulfillmentQuestion")}</h1>
            <p>{t("readyEstimateSentence", { date: readyLabel })}</p>
          </div>
          <fieldset className={styles.choices}>
            <legend className="sr-only">{t("fulfillmentLegend")}</legend>
            {fulfillmentOptions.map(({ id, title, sub, icon: ChoiceIcon }) => (
              <label key={id} className={`${styles.choice} ${fulfillment === id ? styles.choiceActive : ""}`}>
                <input type="radio" className="sr-only" name="fulfillment" value={id} checked={fulfillment === id} onChange={() => setFulfillment(id)} />
                <ChoiceIcon size={24} /><span><strong>{t(title)}</strong><small>{t(sub)}</small></span><i aria-hidden="true">{fulfillment === id && <Check size={14} weight="bold" />}</i>
              </label>
            ))}
          </fieldset>
          <div className={styles.fields}>
            <h2>{t("customerSection")}</h2>
            <label>{t("name")}<input required autoComplete="name" {...field("name")} /></label>
            <label>{t("whatsapp")}<input required type="tel" autoComplete="tel" pattern="^(\+62|62|0)8[0-9 \-]{7,14}$" title={t("whatsappHint")} placeholder="0812 3456 7890" {...field("whatsapp")} /></label>
            {fulfillment === "DELIVERY" && <label>{t("address")}<textarea required rows={3} autoComplete="street-address" placeholder={t("addressPlaceholder")} {...field("address")} /></label>}
            <label>{t("note")}<textarea rows={2} maxLength={180} placeholder={t("notePlaceholder")} {...field("note")} /></label>
            <label className={styles.remember}><input type="checkbox" checked={remember} onChange={(event) => toggleRemember(event.target.checked)} /> {t("remember")}</label>
          </div>
          {error && <p role="alert" className={styles.payNote}>{error}</p>}
          <OrderSummary t={t} qty={qty} total={total} delivery={fulfillment === "DELIVERY"} />
        </form>
      )}

      {step === "success" && placed && (
        <section className={`${styles.success} fade-up`}>
          <div className={styles.check}><Check size={42} weight="bold" /></div>
          <p>{t("successEyebrow")}</p>
          <h1 className="display">{t("thanks", { name: placed.customer.name.split(" ")[0] })}</h1>
          <strong className={styles.orderNo}>{placed.id}</strong>
          <span>{t("readyOn", { date: formatDate(placed.promisedReadyDate, "long", locale) })}</span>
          <div className={styles.successCard}>
            <div><MapPin size={22} /><strong>{t(fulfillmentOptions.find((option) => option.id === placed.fulfillment)!.title)}</strong></div>
            <OrderSummary t={t} qty={placedQty} total={placed.total} delivery={placed.fulfillment === "DELIVERY"} compact />
          </div>
          {showQris ? (
            <div className={styles.qris}>
              <strong>{t("qrisTitle")}</strong>
              <Image className={styles.qrisCode} src="/le-nouette/qris.jpg" alt={t("qrisTitle")} width={1135} height={1600} />
              <p>{t("qrisNote")}</p>
            </div>
          ) : (
            <button className={`${styles.previewLink} btn btn-secondary`} onClick={() => setShowQris(true)}><QrCode size={18} /> {t("payWithQris")}</button>
          )}
          <div className={styles.whatsapp}><WhatsappLogo size={26} weight="fill" /><span>{t("whatsappUpdates")}</span></div>
          <button className={`${styles.previewLink} btn btn-quiet`} onClick={startOver}>{t("orderAgain")}</button>
          <Link href="/founder/orders" className={`${styles.previewLink} btn btn-quiet`}>{t("founderPreview")} <ArrowRight size={18} /></Link>
        </section>
      )}

      {step !== "success" && (
        <footer className={styles.sticky}>
          <div><ShoppingBag size={22} /><span>{t("itemCount", { count })}</span><strong>{formatRupiah(total)}</strong></div>
          <button key={step} className="btn btn-primary" disabled={count === 0 || paused || pending} type={step === "shop" ? "button" : "submit"} form={step === "shop" ? undefined : "checkout"} onClick={step === "shop" ? () => setStep("details") : undefined}>{step === "shop" ? t("continue") : t("placeOrder", { total: formatRupiah(total) })}<ArrowRight size={18} /></button>
        </footer>
      )}
    </main>
  );

}

// ponytail: "Bayar sekarang dengan QRIS" shows the static QRIS artwork once it exists; it never changes payment status (§11.3).
function OrderSummary({ t, qty, total, delivery, compact = false }: { t: (key: Key, vars?: Record<string, string | number>) => string; qty: Record<ProductId, number>; total: number; delivery: boolean; compact?: boolean }) {
  return (
    <div className={`${styles.summary} ${compact ? styles.summaryCompact : ""}`}>
      <h2>{t("summaryTitle")}</h2>
      {products.filter((product) => qty[product.id] > 0).map((product) => <div key={product.id}><span>{qty[product.id]} × {product.name}</span><strong>{formatRupiah(qty[product.id] * product.price)}</strong></div>)}
      <div className={styles.total}><span>{t("total")}</span><strong>{formatRupiah(total)}</strong></div>
      <p className={styles.payNote}>{delivery ? t("payOnDelivery") : t("payOnReceipt")}</p>
    </div>
  );
}

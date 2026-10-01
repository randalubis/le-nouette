"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, MapPin, Minus, Package, Plus, ProhibitInset, QrCode, ShareNetwork, ShoppingBag, Storefront as StoreIcon, Truck, WhatsappLogo, type Icon } from "@phosphor-icons/react";
import { useEffect, useState, useTransition } from "react";
import { formatRupiah, products, type ProductId } from "@/lib/domain/catalog";
import type { CustomerOrderView, Fulfillment, State } from "@/lib/domain/operations";
import { createOrderAction, trackOrdersAction } from "@/lib/domain/actions";
import { formatDate, promisedReadyDate } from "@/lib/domain/schedule";
import { useTranslation, type Key } from "@/lib/i18n";
import { addOrder, readOrders, removeOrder, type MyOrder } from "@/lib/my-orders";
import { readRemembered, saveRemembered } from "@/lib/remembered";
import styles from "./storefront.module.css";

type Step = "shop" | "details" | "success" | "tracking";
type Placed = CustomerOrderView & { publicToken: string };

// ponytail: NEXT_PUBLIC_ is inlined at build time; unset => no WhatsApp button.
const waNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
type Option = { id: Fulfillment; title: Key; sub: Key; icon: Icon };

const productImage: Record<ProductId, string> = { milieu: "/le-nouette/milieu.png", grande: "/le-nouette/grande.png" };

const fulfillmentOptions: Option[] = [
  { id: "PICKUP_MANDIRI", title: "pickupMandiri", sub: "free", icon: StoreIcon },
  { id: "PICKUP_BI", title: "pickupBi", sub: "free", icon: StoreIcon },
  { id: "DELIVERY", title: "delivery", sub: "deliveryFee", icon: Truck },
];

export function Storefront({ storeStatus, calendar }: { storeStatus: State["storeStatus"]; calendar: State["calendar"] }) {
  const { t, locale, setLocale } = useTranslation();
  const [step, setStep] = useState<Step>("shop");
  const [prevStep, setPrevStep] = useState<Step>("shop");
  async function invite() {
    const text = t("inviteText");
    const url = window.location.origin;
    const fallback = () => void window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener");
    if (!navigator.share) return fallback();
    try { await navigator.share({ title: "Le Nouette", text, url }); } catch (e) { if ((e as Error).name !== "AbortError") fallback(); }
  }
  const [qty, setQty] = useState<Record<ProductId, number>>({ milieu: 0, grande: 0 });
  const [fulfillment, setFulfillment] = useState<Fulfillment>("PICKUP_MANDIRI");
  const [remembered] = useState(() => (typeof window === "undefined" ? null : readRemembered()));
  const [form, setForm] = useState({ name: remembered?.name ?? "", whatsapp: remembered?.whatsapp ?? "", address: "", note: "" });
  const [remember, setRemember] = useState(remembered !== null);
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [placedName, setPlacedName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showQris, setShowQris] = useState(false);
  const [pending, startTransition] = useTransition();

  const total = products.reduce((sum, product) => sum + product.price * qty[product.id], 0);
  const count = qty.milieu + qty.grande;
  const paused = storeStatus === "PAUSED";
  const readyLabel = formatDate(promisedReadyDate(new Date(), calendar), "long", locale);
  const placedQty = { milieu: 0, grande: 0, ...Object.fromEntries((placed?.items ?? []).map((item) => [products.find((product) => product.name === item.name)?.id, item.quantity])) } as Record<ProductId, number>;

  const updateQty = (id: ProductId, delta: number) => !(paused && delta > 0) && setQty((current) => ({ ...current, [id]: Math.max(0, current[id] + delta) }));
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
      addOrder({ id: order.id, token: order.publicToken });
      setPlacedName(form.name.trim());
      setPlaced(order);
      setStep("success");
    });
  };

  const startOver = () => {
    setQty({ milieu: 0, grande: 0 });
    setForm((current) => ({ ...current, address: "", note: "" }));
    setPlaced(null);
    setShowQris(false);
    setStep("shop");
  };

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        {step === "details" || step === "tracking" ? <button className={styles.back} aria-label={t("back")} onClick={() => setStep(step === "tracking" ? prevStep : "shop")}><ArrowLeft size={20} /></button> : <span />}
        <Link href="/" className={styles.wordmark}>LE NOUETTE</Link>
        <button className={styles.trackBtn} aria-label={t("trackOrders")} title={t("trackOrders")} onClick={() => { if (step !== "tracking") { setPrevStep(step); setStep("tracking"); } }}><Package size={20} /><span>{t("trackShort")}</span></button>
        <div className={styles.locale} role="group" aria-label={t("langSwitch")}>
          {(["ID", "EN"] as const).map((option) => (
            <button key={option} aria-pressed={locale === option} className={locale === option ? styles.localeActive : ""} onClick={() => setLocale(option)}>{option}</button>
          ))}
        </div>
      </header>

      {step === "shop" && (
        <>
          <section className={`${styles.hero} fade-up`}>
            <Image src="/le-nouette/hero.png" alt="Le Nouette cheese sticks" fill priority quality={60} sizes="(max-width: 760px) 100vw, 760px" />
            <div className={styles.heroShade} />
            <div className={styles.heroCopy}>
              <p>{t("eyebrow")}</p>
              <h1 className="display">{t("heroTitle")}</h1>
              {!paused && <span>{t("heroSub")}</span>}
            </div>
          </section>

          <section className={`${styles.catalog} fade-up-delay`} aria-labelledby="products-title">
            <div className={`${styles.promise} ${paused ? styles.promisePaused : ""}`} role={paused ? "status" : undefined}>
              {paused ? <><span><ProhibitInset size={14} weight="bold" aria-hidden="true" /> {t("pausedTitle")}</span><strong>{t("pausedSub")}</strong></> : <><span>{t("openForOrders")}</span><strong>{t("readyEstimate", { date: readyLabel })}</strong></>}
            </div>
            <h2 id="products-title" className="display">{t("catalogTitle")}</h2>
            {products.map((product, index) => (
              <article className={`${styles.product} ${paused ? styles.productPaused : ""}`} key={product.id}>
                <div className={`${styles.productVisual} ${index === 1 ? styles.pouchVisual : ""}`}>
                  <Image src={productImage[product.id]} alt={`${product.name} ${t(`${product.id}Detail`)}`} fill quality={60} sizes="120px" />
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
                  <button className={styles.plus} disabled={paused} onClick={() => updateQty(product.id, 1)} aria-label={t("increase", { product: product.name })}><Plus size={16} /></button>
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
          <h1 className="display">{t("thanks", { name: placedName.split(" ")[0] })}</h1>
          <strong className={styles.orderNo}>{placed.id}</strong>
          <span>{t("readyOn", { date: formatDate(placed.promisedReadyDate, "long", locale) })}</span>
          <div className={styles.successCard}>
            <div><MapPin size={22} /><strong>{t(fulfillmentOptions.find((option) => option.id === placed.fulfillment)!.title)}</strong></div>
            <OrderSummary t={t} qty={placedQty} total={placed.total} delivery={placed.fulfillment === "DELIVERY"} compact />
          </div>
          {showQris ? (
            <div className={styles.qris}>
              <strong>{t("qrisTitle")}</strong>
              <Image className={styles.qrisCode} src="/le-nouette/qris.jpg" alt={t("qrisTitle")} width={1135} height={1600} sizes="280px" />
              <p>{t("qrisNote")}</p>
            </div>
          ) : (
            <button className={`${styles.previewLink} btn btn-secondary`} onClick={() => setShowQris(true)}><QrCode size={18} /> {t("payWithQris")}</button>
          )}
          <div className={styles.whatsapp}><WhatsappLogo size={26} weight="fill" /><span>{t("whatsappUpdates")}</span></div>
          <button className={`${styles.previewLink} btn btn-quiet`} onClick={startOver}>{t("orderAgain")}</button>
          <button className={`${styles.previewLink} btn btn-quiet`} onClick={invite}><ShareNetwork size={18} /> {t("inviteFriends")}</button>
        </section>
      )}

      {step === "tracking" && <Tracking t={t} locale={locale} />}

      {waNumber && (step === "shop" || step === "success" || step === "tracking") && (
        <a className={`${styles.waChat} btn btn-secondary`} href={`https://wa.me/${waNumber}?text=${encodeURIComponent(step === "success" && placed ? t("waMessageOrder", { id: placed.id }) : t("waMessage"))}`} target="_blank" rel="noopener noreferrer"><WhatsappLogo size={18} weight="fill" /> {t("whatsappChat")}</a>
      )}

      {step !== "success" && step !== "tracking" && (step !== "shop" || (count > 0 && !paused)) && (
        <footer className={styles.sticky}>
          <div><ShoppingBag size={22} /><span>{t("itemCount", { count })}</span><strong>{formatRupiah(total)}</strong></div>
          <button key={step} className="btn btn-primary" disabled={count === 0 || paused || pending} type={step === "shop" ? "button" : "submit"} form={step === "shop" ? undefined : "checkout"} onClick={step === "shop" ? () => setStep("details") : undefined}>{step === "shop" ? t("continue") : t("placeOrder")}<ArrowRight size={18} /></button>
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

type Translate = (key: Key, vars?: Record<string, string | number>) => string;

// Fetches once on mount (= each page load / opening this view); no polling.
function Tracking({ t, locale }: { t: Translate; locale: "ID" | "EN" }) {
  const [initial] = useState<MyOrder[]>(readOrders); // only mounted client-side, on click
  const [stored, setStored] = useState(initial);
  const [views, setViews] = useState<CustomerOrderView[]>([]);
  const [state, setState] = useState<"loading" | "done" | "error">(initial.length === 0 ? "done" : "loading");
  const [nonce, setNonce] = useState(0); // bumped by the Refresh button only
  useEffect(() => {
    if (initial.length === 0) return;
    trackOrdersAction(initial).then((result) => { setViews(result); setState("done"); }, () => setState("error"));
  }, [initial, nonce]);
  const refresh = () => { setState("loading"); setNonce((n) => n + 1); };
  const fulfillmentKey = { PICKUP_MANDIRI: "pickupMandiri", PICKUP_BI: "pickupBi", DELIVERY: "delivery" } as const;
  const waLink = (text: string) => `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
  const statusKey = (o: CustomerOrderView): Key =>
    o.status === "CANCELLED" ? "statusCancelled" : o.status === "COMPLETED" ? "statusCompleted" : o.dispatchedAt ? "statusDispatched" : o.status === "READY_FOR_HANDOVER" ? "statusReady" : "statusNeedsPreparation";
  const forget = (id: string) => { removeOrder(id); setStored((c) => c.filter((o) => o.id !== id)); };
  return (
    <section className={`${styles.formPage} fade-up`}>
      <div className={styles.pageIntro}><h1 className="display">{t("trackTitle")}</h1></div>
      {state === "loading" && <p role="status" className={styles.trackNote}>{t("trackLoading")}</p>}
      {state === "error" && <><p role="alert" className={`${styles.trackNote} ${styles.trackError}`}>{t("trackError")}</p><button className="btn btn-secondary" onClick={refresh}>{t("trackRefresh")}</button></>}
      {state === "done" && stored.length > 0 && <button className={`btn btn-quiet ${styles.trackRefresh}`} onClick={refresh}>{t("trackRefresh")}</button>}
      {state === "done" && stored.length === 0 && <p className={styles.trackNote}>{t("trackEmpty")}</p>}
      {state === "done" && stored.map((o) => {
        const v = views.find((view) => view.id === o.id);
        if (!v) return <div key={o.id} className={`${styles.summary} ${styles.trackCard}`}><div className={styles.trackHead}><h2>{o.id}</h2></div><p className={styles.payNote}>{t("trackNotFound")} {t("trackNotFoundHelp")}</p><div className={styles.trackActions}>{waNumber && <a className="btn btn-secondary" href={waLink(t("waMessageOrder", { id: o.id }))} target="_blank" rel="noopener noreferrer"><WhatsappLogo size={18} weight="fill" /> {t("whatsappChat")}</a>}<button className="btn btn-quiet" onClick={() => forget(o.id)}>{t("trackRemove")}</button></div></div>;
        const closed = v.status === "CANCELLED" || v.status === "COMPLETED";
        return (
          <div key={o.id} className={`${styles.summary} ${styles.trackCard}`}>
            <div className={styles.trackHead}>
              <h2>{v.id}</h2>
              <span className={`${styles.chip} ${v.status === "CANCELLED" ? styles.chipDanger : v.status === "COMPLETED" ? styles.chipNeutral : v.dispatchedAt || v.status === "READY_FOR_HANDOVER" ? styles.chipSafe : styles.chipWarn}`}>{t(statusKey(v))}</span>
            </div>
            <p className={styles.payNote}>{t(fulfillmentKey[v.fulfillment])}</p>
            {!closed && <p className={styles.payNote}>{t("readyDate", { date: formatDate(v.currentReadyDate, "long", locale) })}</p>}
            {v.items.map((item) => <div key={item.name}><span>{item.quantity} × {item.name}</span></div>)}
            <div className={styles.total}><span>{t("total")}</span><strong>{formatRupiah(v.total)}</strong></div>
            <p className={`${styles.payNote} ${v.isPaid ? styles.paid : ""}`}>{t(v.isPaid ? "paidYes" : "paidNo")}</p>
          </div>
        );
      })}
    </section>
  );
}

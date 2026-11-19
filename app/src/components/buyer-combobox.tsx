"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchBuyersAction } from "@/lib/domain/invoice-actions";
import type { BuyerHit } from "@/lib/db/buyers";
import s from "./invoice.module.css";

// Name input that searches earlier buyers on the server (2+ characters, 200 ms debounce). Typing only calls onChange;
// onPick fires only when the owner chooses a result. A request counter drops responses for outdated keystrokes.
export function BuyerCombobox({ value, onChange, onPick }: { value: string; onChange: (name: string) => void; onPick: (b: BuyerHit) => void }) {
  const id = useId();
  const [hits, setHits] = useState<BuyerHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [none, setNone] = useState(false);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  // aria-activedescendant does not scroll; keep the highlighted option visible in the 280px list.
  useEffect(() => { if (active >= 0) document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: "nearest" }); }, [active, id]);

  const type = (name: string) => {
    onChange(name);
    clearTimeout(timer.current);
    const mine = ++seq.current;
    setNone(false);
    if (name.trim().length < 2) { setHits([]); setOpen(false); setActive(-1); return; }
    timer.current = setTimeout(async () => {
      let found: BuyerHit[];
      try { found = await searchBuyersAction(name); } catch { return; } // offline: typing keeps working, just no suggestions
      if (mine !== seq.current) return;
      setHits(found); setActive(-1); setOpen(found.length > 0); setNone(found.length === 0);
    }, 200);
  };
  // Leaving the box drops any pending or in-flight search so a late answer cannot reopen the list over the next field.
  const close = () => { seq.current++; clearTimeout(timer.current); setOpen(false); setActive(-1); setNone(false); };
  const pick = (b: BuyerHit) => {
    seq.current++; clearTimeout(timer.current);
    onPick(b); setHits([]); setOpen(false); setActive(-1); setNone(false);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return close();
    if (!hits.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); setOpen(true);
      setActive((a) => (e.key === "ArrowDown" ? (a + 1) % hits.length : (a <= 0 ? hits.length : a) - 1));
    } else if (e.key === "Enter" && open && active >= 0) {
      e.preventDefault(); pick(hits[active]);
    }
  };

  return (
    <div className={s.field}>
      <label htmlFor={`${id}-input`}>Nama pembeli</label>
      <div className={s.combo}>
        <input id={`${id}-input`} value={value} onChange={(e) => type(e.target.value)} onKeyDown={onKeyDown} onBlur={close}
          role="combobox" aria-expanded={open} aria-controls={open ? `${id}-list` : undefined} aria-autocomplete="list" aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined} autoComplete="off" />
        {open && (
          <ul id={`${id}-list`} role="listbox" aria-label="Pembeli sebelumnya" className={s.comboList}>
            {hits.map((b, i) => (
              // onMouseDown (not onClick) so the pick lands before the input's blur closes the list.
              <li key={b.id} id={`${id}-opt-${i}`} role="option" aria-selected={i === active} className={s.comboOption} onMouseDown={(e) => { e.preventDefault(); pick(b); }}>
                {b.name}
                <small>{[b.phone, b.address].filter(Boolean).join(" · ")}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
      {none && <small role="status">Tidak ada pembeli lama. Lanjut ketik nama baru.</small>}
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { Gift, Check, Copy, LoaderCircle, RotateCcw, Download } from "lucide-react";
import { downloadCoupon } from "@/lib/download-coupon";
import type { Coupon } from "@/lib/campaign";

export default function ScratchCard({ coupon, onReveal }: { coupon: Coupon; onReveal: () => Promise<void> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const previous = useRef<{ x: number; y: number } | null>(null);
  const progress = useRef(0);
  const revealing = useRef(false);
  const [scratchPercent, setScratchPercent] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  useEffect(() => {
    if (!celebrate) return;
    const timer = setTimeout(() => setCelebrate(false), 2200);
    return () => clearTimeout(timer);
  }, [celebrate]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const revealCallback = useRef(onReveal);
  revealCallback.current = onReveal;
  async function reveal() {
    if (revealing.current || coupon.revealed) return;
    revealing.current = true; setPending(true); setError("");
    try { await revealCallback.current(); setCelebrate(true); }
    catch (e) { setError((e as Error).message); }
    finally { revealing.current = false; setPending(false); }
  }
  useEffect(() => {
    if (coupon.revealed || !canvas.current) return;
    const el = canvas.current;
    const draw = () => {
      const rect = el.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      el.width = Math.round(rect.width * ratio); el.height = Math.round(rect.height * ratio);
      const ctx = el.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.scale(ratio, ratio); ctx.fillStyle = "#c8e720"; ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.strokeStyle = "rgba(24,59,46,.12)"; ctx.lineWidth = 1;
      for (let x = -rect.height; x < rect.width; x += 18) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + rect.height, rect.height); ctx.stroke();
      }
      ctx.strokeStyle = "#70821b"; ctx.strokeRect(12, 12, rect.width - 24, rect.height - 24);
      ctx.textAlign = "center"; ctx.fillStyle = "#05543a"; ctx.font = "36px Georgia";
      ctx.fillText("✦", rect.width / 2, rect.height / 2 - 32);
      ctx.font = "26px Georgia"; ctx.fillText("A little luck awaits", rect.width / 2, rect.height / 2 + 10);
      ctx.font = "14px Arial"; ctx.fillText("Scratch here to find your treat", rect.width / 2, rect.height / 2 + 40);
      progress.current = 0; setScratchPercent(0);
    };
    const observer = new ResizeObserver(draw); observer.observe(el);
    return () => observer.disconnect();
  }, [coupon.revealed]);
  function scratch(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragging.current || coupon.revealed || pending) return;
    const el = event.currentTarget, rect = el.getBoundingClientRect();
    const ctx = el.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    ctx.globalCompositeOperation = "destination-out"; ctx.lineWidth = 42; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(previous.current?.x ?? point.x, previous.current?.y ?? point.y); ctx.lineTo(point.x, point.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(point.x, point.y, 21, 0, Math.PI * 2); ctx.fill(); previous.current = point;
    progress.current++;
    if (progress.current % 6 === 0) {
      const pixels = ctx.getImageData(0, 0, el.width, el.height).data;
      let clear = 0, samples = 0;
      for (let i = 3; i < pixels.length; i += 128) { samples++; if (pixels[i] < 128) clear++; }
      setScratchPercent(Math.min(100, Math.round(clear / samples / .42 * 100)));
      if (clear / samples > .42) void reveal();
    }
  }
  return <div className="scratch-experience">
    {celebrate && <div className="confetti" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * .09}s`, background: ["#c8e720", "#f25420", "#05543a"][i % 3], transform: `rotate(${i * 29}deg)` }} />)}</div>}
    <div className={`scratch-ticket ${coupon.revealed ? "is-revealed" : ""}`}>
      <div className="ticket-content" aria-hidden={!coupon.revealed}>
        <Gift size={28} strokeWidth={1.4} /><p className="eyebrow">A treat, on us</p>
        <h3>{coupon.offer}</h3><p className="offer-detail">{coupon.detail}</p>
      </div>
      {!coupon.revealed && <canvas ref={canvas} aria-label="Scratch to reveal your offer, or use the reveal button below" className="scratch-canvas"
        onPointerDown={e => { if (e.pointerType === "mouse" && e.button !== 0) return; dragging.current = true; previous.current = null; e.currentTarget.setPointerCapture(e.pointerId); scratch(e); }}
        onPointerMove={scratch} onPointerUp={() => { dragging.current = false; previous.current = null; }}
        onPointerCancel={() => { dragging.current = false; previous.current = null; }} />}
    </div>
    {coupon.revealed ? <div className="coupon-details" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className={`status ${coupon.active ? "" : "expired"}`}><Check size={14} /> {coupon.active ? "Active offer" : "Expired offer"}</span><span className="text-sm">Valid until {coupon.validUntil}</span></div>
      <div className="coupon-code"><div><p className="eyebrow">Your coupon code</p><strong>{coupon.code}</strong></div><button className="icon-button" aria-label="Copy coupon code" onClick={async () => { try { await navigator.clipboard.writeText(coupon.code); setCopied(true); setCopyError(""); } catch { setCopyError("Select the code above to copy it manually."); } }}>{copied ? <Check size={20} /> : <Copy size={20} />}</button></div>
      {copied && <p role="status" className="text-sm">Coupon code copied.</p>}{copyError && <p role="status" className="text-sm">{copyError}</p>}
      <button className="primary-button save-coupon" disabled={saving} onClick={async () => {
        setSaving(true); setSaveMessage("");
        try { await downloadCoupon(coupon); setSaveMessage("Coupon image ready. Check your downloads."); }
        catch { setSaveMessage("Could not save the image. Copy the code or take a screenshot instead."); }
        finally { setSaving(false); }
      }}>{saving ? <LoaderCircle size={18} className="animate-spin" /> : <Download size={18} />} {saving ? "Preparing image..." : "Save coupon image"}</button>
      {saveMessage && <p role="status" className="text-sm">{saveMessage}</p>}
      <p className="text-sm text-muted-foreground">Show this code to the Madras Pesu team before billing. Demo coupon only; restaurant redemption and prize conditions are not yet confirmed.</p>
    </div> : <div className="mt-4 text-center"><div className="scratch-progress"><label htmlFor="scratch-progress">{pending ? "Unlocking your offer..." : `Scratch to unlock - ${scratchPercent}%`}</label><progress id="scratch-progress" max={100} value={scratchPercent} /></div><p className="text-sm text-muted-foreground">Swipe with your finger or drag your mouse.</p><button className="text-button mt-2" onClick={reveal} disabled={pending}>{pending ? <><LoaderCircle size={16} className="animate-spin" /> Revealing your offer…</> : error ? <><RotateCcw size={16} /> Try revealing again</> : "Or tap to reveal"}</button></div>}
    {error && <p role="alert" className="error-message mt-3">{error}</p>}
  </div>;
}

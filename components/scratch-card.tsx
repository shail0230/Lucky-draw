"use client";
import { useEffect, useRef, useState } from "react";
import { Gift, Check, Copy, LoaderCircle, RotateCcw } from "lucide-react";
import type { Coupon } from "@/lib/campaign";

export default function ScratchCard({ coupon, onReveal }: { coupon: Coupon; onReveal: () => Promise<void> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const previous = useRef<{ x: number; y: number } | null>(null);
  const progress = useRef(0);
  const revealing = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const revealCallback = useRef(onReveal);
  revealCallback.current = onReveal;
  async function reveal() {
    if (revealing.current || coupon.revealed) return;
    revealing.current = true; setPending(true); setError("");
    try { await revealCallback.current(); }
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
      ctx.scale(ratio, ratio); ctx.fillStyle = "#d6c79f"; ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.strokeStyle = "rgba(98,79,35,.12)"; ctx.lineWidth = 1;
      for (let x = -rect.height; x < rect.width; x += 18) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + rect.height, rect.height); ctx.stroke();
      }
      ctx.strokeStyle = "#8a7544"; ctx.strokeRect(12, 12, rect.width - 24, rect.height - 24);
      ctx.textAlign = "center"; ctx.fillStyle = "#05543a"; ctx.font = "36px Georgia";
      ctx.fillText("✦", rect.width / 2, rect.height / 2 - 32);
      ctx.font = "26px Georgia"; ctx.fillText("A little luck awaits", rect.width / 2, rect.height / 2 + 10);
      ctx.font = "14px Arial"; ctx.fillText("Scratch here to find your treat", rect.width / 2, rect.height / 2 + 40);
      progress.current = 0;
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
      if (clear / samples > .42) void reveal();
    }
  }
  return <div>
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
      <p className="text-sm text-muted-foreground">Show this code to the restaurant team on your next visit.</p>
    </div> : <div className="mt-4 text-center"><p className="text-sm text-muted-foreground">Swipe with your finger or drag your mouse.</p><button className="text-button mt-2" onClick={reveal} disabled={pending}>{pending ? <><LoaderCircle size={16} className="animate-spin" /> Revealing your offer…</> : error ? <><RotateCcw size={16} /> Try revealing again</> : "Or tap to reveal"}</button></div>}
    {error && <p role="alert" className="error-message mt-3">{error}</p>}
  </div>;
}

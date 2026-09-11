"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowLeft, Check, ShieldCheck, Ticket, LoaderCircle, Sparkles } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { campaignApi, type Challenge } from "@/lib/api";
import { CAMPAIGN, normalizePhone, type Coupon } from "@/lib/campaign";
import ScratchCard from "./scratch-card";

const steps = ["Your number", "Verify OTP", "Scratch & win"];

export default function LuckyDraw() {
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState("");
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let cancelled = false;
    campaignApi.session().then(result => {
      if (cancelled) return;
      if (result.coupon && result.phone) { setCoupon(result.coupon); setPhone(result.phone.slice(3)); setStep(2); }
    }).catch(() => { if (!cancelled) setNotice("We couldn’t restore your last visit. Enter your number to retrieve your offer."); })
      .finally(() => { if (!cancelled) setRestoring(false); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { if (!restoring) title.current?.focus(); }, [step, restoring]);
  useEffect(() => {
    if (step !== 1) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step]);

  async function sendOtp(event?: React.FormEvent) {
    event?.preventDefault(); if (busy) return;
    setError(""); setNotice("");
    let normalized: string;
    try { normalized = normalizePhone(phone); } catch (e) { setError((e as Error).message); return; }
    setBusy(true);
    try {
      const result = await campaignApi.sendOtp(normalized);
      setPhone(normalized.slice(3)); setChallenge(result); setOtp(""); setNow(Date.now()); setStep(1);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function verify(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    if (otp.length !== 6) { setError("Enter all 6 digits of your verification code."); return; }
    setBusy(true); setError("");
    try { const result = await campaignApi.verifyOtp(otp); setCoupon(result.coupon); setStep(2); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function startAgain() {
    setBusy(true); setError("");
    try { await campaignApi.logout(); setStep(0); setPhone(""); setCoupon(null); setOtp(""); setChallenge(null); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const resendSeconds = challenge ? Math.max(0, Math.ceil((challenge.resendAt - now) / 1000)) : 0;
  const expired = challenge ? now >= challenge.expiresAt : false;
  const maskedPhone = `+91 ${phone.slice(0, 2)}••• •${phone.slice(-4)}`;

  return <div className="site-shell">
    <header className="site-header">
      <a href="/" className="brand" aria-label="Benne Lucky Draw home"><span className="brand-symbol" aria-hidden="true">b.</span><span>benne<span className="brand-sub">GOOD FOOD. GOOD FORTUNE.</span></span></a>
      <div className="header-note"><span className="desktop-note">A little thank you, from our kitchen.</span><span className="campaign-label"><Ticket size={16} /> Lucky Draw 2026</span></div>
    </header>
    <main className="main-layout">
      <section className="story-panel" aria-label="Benne lucky draw campaign">
        <div className="story-top"><p className="eyebrow">Made with love. Served with luck.</p><h1>Stand a chance to win<br /><em>one year</em><br />bene dosa<span className="gold-dot">.</span></h1><p className="story-description">Your next visit could be the start of<br className="hidden lg:block" /> something delicious.</p></div>
        <div className="food-frame">
          <img src="/dosa.jpg" alt="Golden benne dosa served on a banana leaf with chutney and sambar" fetchPriority="high" />
          <div className="photo-caption"><span>A classic worth coming back for.</span><span aria-hidden="true">✦</span></div>
        </div>
        <div className="story-bottom"><span>1,000 coupons. A little luck for everyone.</span><Sparkles size={19} strokeWidth={1.4} /></div>
      </section>
      <section className="entry-panel" aria-label="Enter the lucky draw">
        <ol className="stepper" aria-label="Your progress">{steps.map((label, i) => <li key={label} className={`${step === i ? "current" : ""} ${step > i ? "complete" : ""}`} aria-current={step === i ? "step" : undefined}><span className="step-dot">{step > i ? <Check size={14} /> : String(i + 1).padStart(2, "0")}</span><span>{label}</span></li>)}</ol>
        <div className="form-card">
          {restoring ? <div className="loading-state" role="status"><LoaderCircle className="animate-spin" /><p>Preparing a little good fortune…</p></div> : <div key={step} className="step-content">
            <div className="section-icon" aria-hidden="true">{step === 2 ? <Sparkles size={25} strokeWidth={1.3} /> : <Ticket size={25} strokeWidth={1.3} />}</div>
            <p className="eyebrow mb-3">{step === 0 ? "Your table is ready" : step === 1 ? "One small step" : coupon?.revealed ? "Good fortune, served" : "The delicious part"}</p>
            <h2 ref={title} tabIndex={-1}>{step === 0 ? "Enter your number" : step === 1 ? "Let’s make it you." : coupon?.revealed ? "Look what’s yours." : "Your luck is in."}</h2>
            <p className="form-description">{step === 0 ? "A few seconds. A little scratch. A delicious surprise." : step === 1 ? `Enter the 6-digit code for ${maskedPhone}.` : coupon?.revealed ? "Keep this coupon handy for your next visit." : "Your offer is waiting under the gold. Go on, give it a scratch."}</p>
            {notice && <p className="notice" role="status">{notice}</p>}
            {step === 0 && <form onSubmit={sendOtp} noValidate>
              <label htmlFor="phone">Mobile number</label>
              <div className={`phone-field ${error ? "invalid" : ""}`}><span className="country-code">+91</span><input id="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="Enter 10-digit number" value={phone} onChange={e => { setPhone(e.target.value); setError(""); }} maxLength={18} aria-invalid={!!error} aria-describedby={error ? "form-error" : "phone-hint"} disabled={busy} /></div>
              <p id="phone-hint" className="field-hint">We’ll verify your number with a one-time code.</p>
              {error && <p id="form-error" className="error-message" role="alert">{error}</p>}
              <button className="primary-button" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="animate-spin" size={18} /> Sending code…</> : <>Submit <ArrowRight size={19} /></>}</button>
            </form>}
            {step === 1 && <form onSubmit={verify} noValidate>
              <label htmlFor="otp">Verification code</label>
              <InputOTP id="otp" maxLength={6} pattern="[0-9]*" value={otp} onChange={value => { setOtp(value); setError(""); }} inputMode="numeric" autoComplete="one-time-code" aria-invalid={!!error} aria-describedby={error ? "form-error" : "otp-hint"} disabled={busy}>
                <InputOTPGroup className="otp-group">{Array.from({ length: 6 }, (_, i) => <InputOTPSlot key={i} index={i} className="otp-slot" />)}</InputOTPGroup>
              </InputOTP>
              <p id="otp-hint" className="field-hint">{expired ? "This code has expired. Request a new one below." : "Your code is valid for 5 minutes."}</p>
              {error && <p id="form-error" className="error-message" role="alert">{error}</p>}
              <button className="primary-button" type="submit" disabled={busy || expired}>{busy ? <><LoaderCircle className="animate-spin" size={18} /> Please wait…</> : <>Verify <ArrowRight size={19} /></>}</button>
              <div className="otp-actions"><button type="button" className="text-button" disabled={busy} onClick={() => { setStep(0); setError(""); }}><ArrowLeft size={15} /> Change number</button><button type="button" className="text-button" onClick={() => void sendOtp()} disabled={busy || resendSeconds > 0}>Resend OTP{resendSeconds > 0 ? ` (${resendSeconds}s)` : ""}</button></div>
              <div className="demo-code" role="status"><span>Demo verification</span><strong>{challenge?.demoCode}</strong><p>No SMS is sent. Use this code to try the experience.</p></div>
            </form>}
            {step === 2 && coupon && <><ScratchCard coupon={coupon} onReveal={async () => { const result = await campaignApi.reveal(); setCoupon(result.coupon); }} />{error && <p className="error-message" role="alert">{error}</p>}<button className="text-button another-number" onClick={startAgain} disabled={busy}><ArrowLeft size={15} /> Use another number</button></>}
            <div className="form-footnote"><ShieldCheck size={17} strokeWidth={1.5} /><p>One number. One offer. Yours to enjoy.</p></div>
          </div>}
        </div>
        <div className="campaign-footnote"><span>Good food brings us together.</span><p>Offers valid until <strong>{CAMPAIGN.validUntil}</strong></p></div>
      </section>
    </main>
    <footer className="site-footer"><span>With love, from benne.</span><span>Demo experience · Sample prizes · No SMS sent</span></footer>
  </div>;
}


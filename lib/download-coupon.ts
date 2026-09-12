import type { Coupon } from "./campaign";

export async function downloadCoupon(coupon: Coupon) {
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 1200;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image export unavailable");
  ctx.fillStyle = "#f7f7f2";
  ctx.fillRect(0, 0, 1000, 1200);
  ctx.fillStyle = "#c8e720";
  ctx.fillRect(0, 0, 1000, 18);
  const logo = new Image();
  logo.src = "/madras-pesu-logo.jpeg";
  await logo.decode();
  ctx.drawImage(logo, 395, 40, 210, 210);
  ctx.textAlign = "center";
  ctx.fillStyle = "#05543a";
  ctx.font = "bold 24px Arial";
  ctx.fillText("MADRAS PESU · LUCKY DRAW", 500, 295);
  const wrapped = (text: string, y: number, font: string, lineHeight: number) => {
    ctx.font = font;
    let line = "";
    for (const word of text.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > 840 && line) {
        ctx.fillText(line, 500, y); y += lineHeight; line = word;
      } else line = next;
    }
    ctx.fillText(line, 500, y);
    return y + lineHeight;
  }
  let y = wrapped(coupon.offer, 380, "bold 52px Georgia", 65);
  y = wrapped(coupon.detail, y + 15, "26px Arial", 36);
  ctx.fillStyle = "#c8e720";
  ctx.fillRect(60, y + 20, 880, 160);
  ctx.fillStyle = "#183b2e";
  ctx.font = "20px Arial";
  ctx.fillText("YOUR COUPON CODE", 500, y + 65);
  ctx.font = "bold 36px monospace";
  ctx.fillText(coupon.code, 500, y + 125, 820);
  y += 235;
  y = wrapped(`${coupon.active ? "Valid until" : "Expired:"} ${coupon.validUntil}`, y, "bold 25px Arial", 38);
  y = wrapped("Show this code to the Madras Pesu team before billing.", y + 25, "25px Arial", 36);
  wrapped("Demo coupon · Sample prize · Restaurant redemption and prize conditions must be confirmed before live use. One offer per mobile number.", y + 30, "22px Arial", 32);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Export failed")), "image/png"));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `madras-pesu-${coupon.code}.png`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

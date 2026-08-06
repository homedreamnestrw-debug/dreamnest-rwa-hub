import html2canvas from "html2canvas";
import jsPDF from "jspdf";

async function snapshot(el: HTMLElement) {
  return html2canvas(el, { scale: 2, backgroundColor: null, useCORS: true, logging: false });
}

export async function downloadVoucherPng(el: HTMLElement, code: string) {
  const canvas = await snapshot(el);
  const link = document.createElement("a");
  link.download = `DreamNest-Voucher-${code}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export async function downloadVoucherPdf(el: HTMLElement, code: string) {
  const canvas = await snapshot(el);
  const img = canvas.toDataURL("image/png");
  // DL / A6 landscape-ish: keep the artwork's 1050x700 ratio at 210x140mm
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [210, 140] });
  pdf.addImage(img, "PNG", 0, 0, 210, 140);
  pdf.save(`DreamNest-Voucher-${code}.pdf`);
}

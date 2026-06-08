import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportElementToPDF(el: HTMLElement, filename: string, title: string) {
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    windowWidth: el.scrollWidth,
  });
  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const headerH = 40;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(title, margin, margin + 8);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(`Generated ${new Date().toLocaleString()}`, margin, margin + 22);

  const imgW = pageW - margin * 2;
  const imgH = (canvas.height * imgW) / canvas.width;

  if (imgH <= pageH - margin * 2 - headerH) {
    pdf.addImage(imgData, "JPEG", margin, margin + headerH, imgW, imgH);
  } else {
    // multi-page slicing
    const pxPerPt = canvas.width / imgW;
    const sliceHpt = pageH - margin * 2 - headerH;
    const sliceHpx = sliceHpt * pxPerPt;
    let y = 0;
    let page = 0;
    while (y < canvas.height) {
      const h = Math.min(sliceHpx, canvas.height - y);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = h;
      const ctx = slice.getContext("2d")!;
      ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      if (page > 0) {
        pdf.addPage();
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(14);
        pdf.text(title, margin, margin + 8);
      }
      pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin + headerH, imgW, h / pxPerPt);
      y += h;
      page++;
    }
  }

  pdf.save(filename);
}

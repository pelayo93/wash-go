import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// CSV export
export function exportToCSV(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// PDF export
export function exportToPDF(
  title: string,
  filename: string,
  headers: string[],
  rows: string[][],
  summary?: { label: string; value: string }[]
) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-CO")}`, 14, 28);

  let startY = 35;

  if (summary && summary.length > 0) {
    summary.forEach((s, i) => {
      doc.setFontSize(10);
      doc.text(`${s.label}: ${s.value}`, 14, startY + i * 7);
    });
    startY += summary.length * 7 + 5;
  }

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
  });

  doc.save(`${filename}.pdf`);
}

import { jsPDF } from "jspdf";

/**
 * Generates an elegant, invoice-style PDF for booking confirmation.
 * Runs client-side and returns a Blob.
 */
export const generateAppointmentPDF = (booking, selectedServices) => {
  const serviceCount = selectedServices.length;
  const servicesHeight = serviceCount * 7.5;
  const cardStartY = 80;

  const yPosAfterServices = 151 + servicesHeight;
  const totalsDividerY = yPosAfterServices + 2;
  const totalsY = totalsDividerY + 7;
  const cardEndY = totalsY + 8;
  const cardHeight = cardEndY - cardStartY;

  const thankYouY = cardEndY + 12;
  const thankYouDividerY = thankYouY + 5;
  const footerY = thankYouDividerY + 7;
  const pageHeight = Math.max(225, footerY + 15);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [210, pageHeight]
  });

  const logoX = 105;
  const logoY = 32;
  const logoR = 12;

  // 1. Double Border Accents (dynamically sized based on pageHeight)
  doc.setDrawColor(197, 168, 128); // Elegant Gold (#c5a880)
  doc.setLineWidth(0.75);
  doc.rect(10, 10, 190, pageHeight - 20);

  doc.setDrawColor(251, 228, 230); // Soft rose pink (#fbe4e6)
  doc.setLineWidth(0.25);
  doc.rect(12, 12, 186, pageHeight - 24);

  // 2. Vector Circular Logo
  doc.setDrawColor(219, 39, 119); // Rose pink (#db2777)
  doc.setLineWidth(0.6);
  doc.circle(logoX, logoY, logoR);

  doc.setDrawColor(219, 39, 119);
  doc.setLineWidth(0.25);
  doc.circle(logoX, logoY, logoR - 1.5);

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(219, 39, 119);
  doc.text("DB", logoX, logoY + 2, { align: "center" });

  doc.setFont("times", "normal");
  doc.setFontSize(5);
  doc.text("Dhanvika", logoX, logoY + 6.5, { align: "center" });

  // 3. Brand Header
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(190, 24, 74); // Rose-700 (#be185d)
  doc.text("Dhanvika Beauty Parlour", logoX, 54, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(197, 168, 128); // Gold (#c5a880)
  doc.text("Beauty | Elegance | Confidence", logoX, 60, { align: "center" });

  // Horizontal divider
  doc.setDrawColor(197, 168, 128);
  doc.setLineWidth(0.4);
  doc.line(35, 65, 175, 65);

  // 4. Document Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(190, 24, 74);
  doc.text("APPOINTMENT CONFIRMATION SLIP", logoX, 74, { align: "center" });

  // 5. Booking Summary Card Box (dynamically sized)
  doc.setFillColor(255, 250, 250); // extremely light pink tint
  doc.setDrawColor(229, 213, 192); // soft gold border
  doc.setLineWidth(0.4);
  doc.roundedRect(20, cardStartY, 170, cardHeight, 3, 3, "FD");

  // CLIENT DETAILS
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(190, 24, 74);
  doc.text("CLIENT DETAILS", 26, 90);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99); // gray-600
  doc.text("Customer Name:", 26, 98);
  doc.text("Phone Number:", 26, 106);
  doc.text("Email Address:", 26, 114);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39); // dark gray-900
  doc.text(String(booking.customerName || ""), 58, 98);
  doc.text(String(booking.phone || ""), 58, 106);
  doc.text(String(booking.email || ""), 58, 114);

  // APPOINTMENT DETAILS
  doc.setFont("helvetica", "bold");
  doc.setTextColor(190, 24, 74);
  doc.text("APPOINTMENT DETAILS", 112, 90);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(75, 85, 99);
  doc.text("Booking ID:", 112, 98);
  doc.text("Date:", 112, 106);
  doc.text("Time:", 112, 114);
  doc.text("Status:", 112, 122);

  // Values right column
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text(String(booking.appointmentId || ""), 140, 98);

  let formattedDate = booking.bookingDate || "";
  try {
    if (booking.bookingDate) {
      formattedDate = new Date(booking.bookingDate + "T00:00:00").toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    }
  } catch (e) {
    formattedDate = booking.bookingDate;
  }
  doc.text(String(formattedDate), 140, 106);
  doc.text(String(booking.startTime || ""), 140, 114);

  // Confirmed status in emerald green
  doc.setTextColor(16, 185, 129);
  doc.text("Confirmed", 140, 122);

  // Inline card divider line
  doc.setDrawColor(244, 63, 94);
  doc.setLineWidth(0.15);
  doc.line(26, 129, 184, 129);

  // SELECTED SERVICES
  doc.setFont("helvetica", "bold");
  doc.setTextColor(190, 24, 74);
  doc.text("SELECTED SERVICES", 26, 136);

  // Table Headers
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Service Name", 26, 143);
  doc.text("Duration", 125, 143);
  doc.text("Price", 184, 143, { align: "right" });

  doc.setDrawColor(229, 213, 192);
  doc.setLineWidth(0.35);
  doc.line(26, 145, 184, 145);

  // Services Row Loop
  let yPos = 151;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);

  selectedServices.forEach((s) => {
    doc.text(s.name, 26, yPos);
    doc.text(s.duration, 125, yPos);
    doc.text(s.price, 184, yPos, { align: "right" });
    yPos += 7.5;
  });

  // Services total divider line
  doc.setDrawColor(229, 213, 192);
  doc.setLineWidth(0.35);
  doc.line(26, totalsDividerY, 184, totalsDividerY);

  // Services Totals
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text("Total Duration:", 26, totalsY);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text(`${booking.totalDuration || 0} min`, 53, totalsY);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(190, 24, 74);
  doc.text("Total Amount:", 112, totalsY);

  doc.setFontSize(10.5);
  doc.text(booking.price, 184, totalsY, { align: "right" });

  // 6. Footer Thank You (Placed directly below card)
  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.setTextColor(190, 24, 74);
  doc.text("Thank you for choosing Dhanvika Beauty Parlour. We look forward to serving you.", logoX, thankYouY, { align: "center" });

  doc.setDrawColor(197, 168, 128);
  doc.setLineWidth(0.3);
  doc.line(55, thankYouDividerY, 155, thankYouDividerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text("Dhanvika Beauty Parlour © 2026. All rights reserved.", logoX, footerY, { align: "center" });

  return doc.output("blob");
};

/**
 * Uploads a file blob temporarily to a public file host.
 * Tries file.io first, with a fallback to tmpfiles.org.
 * Returns the downloadable URL.
 */
export const uploadPDF = async (pdfBlob) => {
  const formData = new FormData();
  formData.append("file", pdfBlob, "Dhanvika_Appointment_Slip.pdf");

  try {
    // Try file.io first
    const response = await fetch("https://file.io", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error(`file.io failed with status: ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.link) {
      return data.link;
    }
    throw new Error("file.io upload response did not indicate success");
  } catch (error) {
    console.warn("file.io upload failed, attempting fallback to tmpfiles.org:", error);

    try {
      // Fallback: tmpfiles.org
      const response = await fetch("https://tmpfiles.org/api/v1/upload", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(`tmpfiles.org failed with status: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === "success" && data.data && data.data.url) {
        const previewUrl = data.data.url;
        // Convert to a direct download link by changing /tmpfiles.org/ to /tmpfiles.org/dl/
        return previewUrl.replace("https://tmpfiles.org/", "https://tmpfiles.org/dl/");
      }
      throw new Error("tmpfiles.org response format unknown");
    } catch (fallbackError) {
      console.error("All upload file hosts failed:", fallbackError);
      throw new Error("Unable to upload PDF confirmation slip. Please try again.");
    }
  }
};

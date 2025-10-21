import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDelivery } from "../context/DeliveryContext";
import jsPDF from "jspdf";
import "./ReviewPage.css";

const ReviewPage = () => {
  const navigate = useNavigate();
  const { mapScreenshot, designPlan, formData } = useDelivery();
  const canvasRef = useRef(null);

  // Check if we have all required data
  useEffect(() => {
    if (
      !mapScreenshot ||
      !designPlan.truck ||
      !designPlan.dropZones.length ||
      !designPlan.loadArrow ||
      !designPlan.driver ||
      !designPlan.windArrow
    ) {
      alert("Please complete the design plan first!");
      navigate("/design-plan");
      return;
    }

    if (!formData.driverName || !formData.clientName) {
      alert("Please complete the delivery form first!");
      navigate("/form");
      return;
    }

    // Render design plan on canvas
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = mapScreenshot;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Draw annotations (same logic as DesignPlan.jsx)
      const icons = {
        truck: "https://example.com/truck-icon.png",
        cone: "https://example.com/cone-icon.png",
        driver: "https://example.com/driver-icon.png",
        loadArrow: "https://example.com/arrow-icon.png",
        windArrow: "https://example.com/wind-arrow-icon.png",
      };

      const drawIcon = (src, x, y, size = 30, rotation = 0) => {
        const icon = new Image();
        icon.src = src;
        icon.onload = () => {
          ctx.save();
          ctx.translate(x + size / 2, y + size / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.drawImage(icon, -size / 2, -size / 2, size, size);
          ctx.restore();
        };
      };

      designPlan.lines.forEach((line) => {
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 3;
        line.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      });

      if (designPlan.truck) {
        drawIcon(icons.truck, designPlan.truck.x, designPlan.truck.y);
      }

      designPlan.cones.forEach((cone) => {
        drawIcon(icons.cone, cone.x, cone.y, 20);
      });

      designPlan.dropZones.forEach((zone) => {
        ctx.fillStyle = "#EF4444";
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, 15, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(zone.number.toString(), zone.x, zone.y);
      });

      if (designPlan.loadArrow) {
        drawIcon(
          icons.loadArrow,
          designPlan.loadArrow.x,
          designPlan.loadArrow.y,
          30,
          designPlan.loadArrow.rotation
        );
      }

      if (designPlan.driver) {
        drawIcon(icons.driver, designPlan.driver.x, designPlan.driver.y);
      }

      if (designPlan.windArrow) {
        drawIcon(
          icons.windArrow,
          designPlan.windArrow.x,
          designPlan.windArrow.y,
          30,
          designPlan.windArrow.rotation
        );
      }
    };
  }, [mapScreenshot, designPlan, formData, navigate]);

  // Generate PDF
  const generatePDF = async () => {
    try {
      console.log("Starting PDF generation...");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const maxY = pageHeight - 20;
      let yPosition = 20;

      const checkPageBreak = (requiredSpace) => {
        if (yPosition + requiredSpace > maxY) {
          pdf.addPage();
          yPosition = 20;
          return true;
        }
        return false;
      };

      // Header
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.text("HIAB DELIVERY SITE PLAN", pageWidth / 2, yPosition, {
        align: "center",
      });

      yPosition += 10;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text("Drop-off Location & Details", pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 5;

      // Delivery Information
      checkPageBreak(50);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(margin, yPosition, pageWidth - margin * 2, 45, "F");

      yPosition += 7;
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Delivery Information", 15, yPosition);

      yPosition += 8;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");

      pdf.setFont("helvetica", "bold");
      pdf.text("Driver Name:", 15, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(formData.driverName, 50, yPosition);

      yPosition += 7;
      pdf.setFont("helvetica", "bold");
      pdf.text("Client Name:", 15, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(formData.clientName, 50, yPosition);

      yPosition += 7;
      pdf.setFont("helvetica", "bold");
      pdf.text("Client Address:", 15, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(formData.clientAddress, 50, yPosition);

      yPosition += 7;
      pdf.setFont("helvetica", "bold");
      pdf.text("Delivery Date:", 15, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(new Date(formData.date).toLocaleDateString(), 50, yPosition);

      yPosition += 5;

      // Load Details
      checkPageBreak(25);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(margin, yPosition, pageWidth - margin * 2, 20, "F");

      yPosition += 7;
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Load Details", 15, yPosition);

      yPosition += 8;
      pdf.setFontSize(10);

      pdf.setFont("helvetica", "bold");
      pdf.text("Description:", 15, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(formData.loadDescription, 50, yPosition);

      yPosition += 7;
      pdf.setFont("helvetica", "bold");
      pdf.text("Weight:", 15, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${formData.weight} kg`, 50, yPosition);

      yPosition += 10;

      // Design Plan
      if (mapScreenshot) {
        const canvas = canvasRef.current;
        const imgData = canvas.toDataURL("image/png");
        const maxImageWidth = pageWidth - margin * 2;
        const maxImageHeight = 120;

        let imgWidth = canvas.width;
        let imgHeight = canvas.height;

        if (imgWidth > maxImageWidth) {
          const scaleFactor = maxImageWidth / imgWidth;
          imgWidth = maxImageWidth;
          imgHeight = imgHeight * scaleFactor;
        }

        if (imgHeight > maxImageHeight) {
          const scaleFactor = maxImageHeight / imgHeight;
          imgWidth = imgWidth * scaleFactor;
          imgHeight = maxImageHeight;
        }

        const xPosition = (pageWidth - imgWidth) / 2;

        checkPageBreak(imgHeight + 20);

        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Site Plan", 15, yPosition);
        yPosition += 7;

        pdf.addImage(imgData, "PNG", xPosition, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
      }

      // Annotations Summary
      checkPageBreak(30);
      yPosition += 5;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("Annotations:", 15, yPosition);
      yPosition += 7;
      pdf.setFont("helvetica", "normal");
      pdf.text(`Drop Zones: ${designPlan.dropZones.length}`, 20, yPosition);
      yPosition += 7;
      pdf.text(`Cones: ${designPlan.cones.length}`, 20, yPosition);
      yPosition += 7;
      pdf.text(`Lines: ${designPlan.lines.length}`, 20, yPosition);

      // Access Notes
      if (formData.accessNotes) {
        const splitNotes = pdf.splitTextToSize(
          formData.accessNotes,
          pageWidth - 30
        );
        const notesHeight = splitNotes.length * 5 + 14;

        checkPageBreak(notesHeight + 10);

        pdf.setFillColor(255, 255, 255);
        pdf.rect(margin, yPosition, pageWidth - margin * 2, notesHeight, "F");

        yPosition += 7;
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("Access Notes:", 15, yPosition);

        yPosition += 7;
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text(splitNotes, 15, yPosition);
        yPosition += splitNotes.length * 5 + 10;
      }

      // Special Instructions
      if (formData.specialInstructions) {
        const splitInstructions = pdf.splitTextToSize(
          formData.specialInstructions,
          pageWidth - 30
        );
        const instructionsHeight = splitInstructions.length * 5 + 14;

        checkPageBreak(instructionsHeight + 10);

        pdf.setFillColor(255, 255, 255);
        pdf.rect(
          margin,
          yPosition,
          pageWidth - margin * 2,
          instructionsHeight,
          "F"
        );

        yPosition += 7;
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("Special Instructions:", 15, yPosition);

        yPosition += 7;
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text(splitInstructions, 15, yPosition);
      }

      // Footer
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(107, 114, 128);
        pdf.text(
          `Generated on ${new Date().toLocaleString()} | Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      pdf.save(`Hiab-Site-Plan-${formData.clientName.replace(/\s/g, "-")}.pdf`);
      console.log("PDF generated successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  };

  return (
    <div className="review-container">
      <div className="review-header">
        <h1>Review & Generate PDF</h1>
        <p>Step 4: Review your delivery plan and generate PDF</p>
      </div>

      <div className="review-content">
        {/* Delivery Info */}
        <div className="review-section">
          <h2>Delivery Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Driver:</span>
              <span className="info-value">{formData.driverName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Client:</span>
              <span className="info-value">{formData.clientName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Address:</span>
              <span className="info-value">{formData.clientAddress}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Date:</span>
              <span className="info-value">
                {new Date(formData.date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Load Details */}
        <div className="review-section load-section">
          <h2>Load Details</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Description:</span>
              <span className="info-value">{formData.loadDescription}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Weight:</span>
              <span className="info-value">{formData.weight} kg</span>
            </div>
          </div>
        </div>

        {/* Design Plan */}
        <div className="review-section map-section">
          <h2>Site Plan</h2>
          <div id="pdf-map" className="review-map">
            <canvas ref={canvasRef} />
          </div>
          <div className="coordinates">
            <div className="coord-item">
              <div className="coord-marker blue"></div>
              <span>
                Truck Position: {designPlan.truck ? "Set" : "Not set"}
              </span>
            </div>
            <div className="coord-item">
              <div className="coord-marker red"></div>
              <span>Drop Zones: {designPlan.dropZones.length}</span>
            </div>
            <div className="coord-item">
              <div className="coord-marker orange"></div>
              <span>Cones: {designPlan.cones.length}</span>
            </div>
            <div className="coord-item">
              <div className="coord-marker green"></div>
              <span>
                Driver Position: {designPlan.driver ? "Set" : "Not set"}
              </span>
            </div>
            <div className="coord-item">
              <div className="coord-marker purple"></div>
              <span>
                Load Direction: {designPlan.loadArrow ? "Set" : "Not set"}
              </span>
            </div>
            <div className="coord-item">
              <div className="coord-marker cyan"></div>
              <span>
                Wind Direction: {designPlan.windArrow ? "Set" : "Not set"}
              </span>
            </div>
          </div>
        </div>

        {/* Access Notes */}
        {formData.accessNotes && (
          <div className="review-section notes-section">
            <h2>Access Notes</h2>
            <p>{formData.accessNotes}</p>
          </div>
        )}

        {/* Special Instructions */}
        {formData.specialInstructions && (
          <div className="review-section instructions-section">
            <h2>Special Instructions</h2>
            <p>{formData.specialInstructions}</p>
          </div>
        )}
      </div>

      <div className="review-actions">
        <button className="btn btn-secondary" onClick={() => navigate("/form")}>
          ← Edit Details
        </button>
        <button className="btn btn-primary" onClick={generatePDF}>
          📄 Generate PDF
        </button>
      </div>
    </div>
  );
};

export default ReviewPage;

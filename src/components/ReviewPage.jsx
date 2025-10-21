import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { useDelivery } from "../context/DeliveryContext";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./ReviewPage.css";

const ReviewPage = () => {
  const navigate = useNavigate();
  const { markers, mapCenter, formData } = useDelivery();
  const mapRef = useRef(null);

  // Check if we have all required data
  useEffect(() => {
    if (!markers.truck || !markers.drop) {
      alert("Please complete the map markers first!");
      navigate("/");
      return;
    }

    if (!formData.driverName || !formData.clientName) {
      alert("Please complete the delivery form first!");
      navigate("/form");
      return;
    }
  }, [markers, formData, navigate]);

  const mapContainerStyle = {
    width: "100%",
    height: "400px",
    borderRadius: "8px",
  };

  const mapOptions = {
    mapTypeId: "satellite",
    disableDefaultUI: true,
    zoomControl: false,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
  };

  // Generate PDF
  // Generate PDF
  const generatePDF = async () => {
    try {
      console.log("Starting PDF generation...");

      // Create new PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const maxY = pageHeight - 20; // Leave space for footer
      let yPosition = 20;

      // Helper function to check if we need a new page
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

      // Delivery Information Section
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

      // Load Details Section
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

      // Capture map as image
      const mapElement = document.getElementById("pdf-map");
      if (mapElement) {
        console.log("Capturing map screenshot...");
        const canvas = await html2canvas(mapElement, {
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          scale: 2, // Improve quality on small screens
        });
        const imgData = canvas.toDataURL("image/png");

        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 10;
        const maxImageWidth = pageWidth - margin * 2;
        const maxImageHeight = 120; // Limit height to ~120mm (~1/2 page) to prevent overflow

        // Calculate dimensions while preserving aspect ratio and respecting max height
        let imgWidth = canvas.width;
        let imgHeight = canvas.height;

        // First, scale to fit width
        if (imgWidth > maxImageWidth) {
          const scaleFactor = maxImageWidth / imgWidth;
          imgWidth = maxImageWidth;
          imgHeight = imgHeight * scaleFactor;
        }

        // Then, if still too tall, scale down to max height
        if (imgHeight > maxImageHeight) {
          const scaleFactor = maxImageHeight / imgHeight;
          imgWidth = imgWidth * scaleFactor;
          imgHeight = maxImageHeight;
        }

        // Calculate x position to center the image
        const xPosition = (pageWidth - imgWidth) / 2; // Center horizontally

        // Check if map fits on current page (use constrained height)
        checkPageBreak(imgHeight + 20); // +20 for title + padding

        // Add title
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Site Plan", 15, yPosition);
        yPosition += 7;

        // Add image with centered x position
        pdf.addImage(imgData, "PNG", xPosition, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
      }

      // Marker coordinates
      checkPageBreak(20);
      yPosition += 5;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("Truck Position:", 15, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `${markers.truck.lat.toFixed(6)}, ${markers.truck.lng.toFixed(6)}`,
        50,
        yPosition
      );

      yPosition += 7;
      pdf.setFont("helvetica", "bold");
      pdf.text("Drop Location:", 15, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `${markers.drop.lat.toFixed(6)}, ${markers.drop.lng.toFixed(6)}`,
        50,
        yPosition
      );

      yPosition += 10;

      // Access Notes (if provided)
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

      // Special Instructions (if provided)
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

      // Footer on last page
      const totalPages = pdf.internal.pages.length - 1; // -1 because first page is null
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

      // Save PDF
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
        <p>Step 3: Review your delivery plan and generate PDF</p>
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

        {/* Map */}
        <div className="review-section map-section">
          <h2>Site Plan</h2>
          <div id="pdf-map" className="review-map">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={18}
              options={mapOptions}
              onLoad={(map) => (mapRef.current = map)}
            >
              {markers.truck && (
                <Marker
                  position={markers.truck}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 12,
                    fillColor: "#3B82F6",
                    fillOpacity: 1,
                    strokeColor: "#1E40AF",
                    strokeWeight: 3,
                  }}
                  title="Truck Position"
                />
              )}
              {markers.drop && (
                <Marker
                  position={markers.drop}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 12,
                    fillColor: "#EF4444",
                    fillOpacity: 1,
                    strokeColor: "#991B1B",
                    strokeWeight: 3,
                  }}
                  title="Drop Location"
                />
              )}
            </GoogleMap>
          </div>
          <div className="coordinates">
            <div className="coord-item">
              <div className="coord-marker blue"></div>
              <span>
                Truck: {markers.truck?.lat.toFixed(6)},{" "}
                {markers.truck?.lng.toFixed(6)}
              </span>
            </div>
            <div className="coord-item">
              <div className="coord-marker red"></div>
              <span>
                Drop: {markers.drop?.lat.toFixed(6)},{" "}
                {markers.drop?.lng.toFixed(6)}
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

      {/* Actions */}
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

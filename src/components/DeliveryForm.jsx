import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDelivery } from "../context/DeliveryContext";
import jsPDF from "jspdf";
import truckIcon from "../utils/truck.svg";
import coneIcon from "../utils/cone.svg";
import driverIcon from "../utils/driver.svg";
import loadArrowIcon from "../utils/loadArrow.svg";
import windArrowIcon from "../utils/windArrow.svg";
import siteIcon from "../utils/site.svg";
import "./DeliveryForm.css";

const ICON_SRCS = {
  truck: truckIcon,
  cone: coneIcon,
  driver: driverIcon,
  loadArrow: loadArrowIcon,
  windArrow: windArrowIcon,
  site: siteIcon,
};

const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const DeliveryForm = () => {
  const navigate = useNavigate();
  const {
    formData: contextFormData,
    updateFormData,
    designPlan,
    mapScreenshot,
  } = useDelivery();

  const [formData, setFormData] = useState(contextFormData);
  const [errors, setErrors] = useState({});
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (
      !designPlan.truck ||
      !designPlan.dropZones.length ||
      !designPlan.loadArrow ||
      !designPlan.driver ||
      !designPlan.windArrow
    ) {
      alert("Please complete the design plan first!");
      navigate("/design-plan");
    }
  }, [designPlan, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.driverName.trim()) newErrors.driverName = "Driver name is required";
    if (!formData.clientName.trim()) newErrors.clientName = "Client name is required";
    if (!formData.clientAddress.trim()) newErrors.clientAddress = "Client address is required";
    if (!formData.date) newErrors.date = "Delivery date is required";
    if (!formData.loadDescription.trim()) newErrors.loadDescription = "Load description is required";
    if (!formData.weight || formData.weight <= 0) newErrors.weight = "Valid weight is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Build an off-screen canvas with the map + all annotations drawn on top
  const buildAnnotatedCanvas = async () => {
    const mapImg = await loadImage(mapScreenshot);
    if (!mapImg) throw new Error("Failed to load map screenshot");

    const canvas = document.createElement("canvas");
    canvas.width = mapImg.width;
    canvas.height = mapImg.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(mapImg, 0, 0);

    // Load all icon images in parallel
    const iconEntries = await Promise.all(
      Object.entries(ICON_SRCS).map(async ([key, src]) => [key, await loadImage(src)])
    );
    const icons = Object.fromEntries(iconEntries.filter(([, img]) => img !== null));

    const drawIcon = (key, x, y, size, rotation = 0) => {
      const img = icons[key];
      if (!img) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    };

    // Lines
    designPlan.lines.forEach((line) => {
      ctx.beginPath();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 3;
      line.points.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    });

    // Site
    if (designPlan.site) {
      drawIcon("site", designPlan.site.x, designPlan.site.y, designPlan.site.size || 200, designPlan.site.rotation || 0);
    }

    // Truck
    if (designPlan.truck) {
      drawIcon("truck", designPlan.truck.x, designPlan.truck.y, designPlan.truck.size || 100, designPlan.truck.rotation || 0);
    }

    // Cones
    designPlan.cones.forEach((cone) => {
      ctx.fillStyle = "#e67b16";
      ctx.beginPath();
      ctx.arc(cone.x, cone.y, 15, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Drop zones
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

    // Load arrow
    if (designPlan.loadArrow) {
      drawIcon("loadArrow", designPlan.loadArrow.x, designPlan.loadArrow.y, 100, designPlan.loadArrow.rotation);
    }

    // Driver
    if (designPlan.driver) {
      drawIcon("driver", designPlan.driver.x, designPlan.driver.y, 60, 0);
    }

    // Wind arrow
    if (designPlan.windArrow) {
      drawIcon("windArrow", designPlan.windArrow.x, designPlan.windArrow.y, 200, designPlan.windArrow.rotation);
    }

    return canvas;
  };

  const generatePDF = async (data) => {
    const canvas = await buildAnnotatedCanvas();

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const maxY = pageHeight - 20;
    let y = 20;

    const checkBreak = (space) => {
      if (y + space > maxY) {
        pdf.addPage();
        y = 20;
      }
    };

    // Header
    pdf.setFontSize(22);
    pdf.setFont("helvetica", "bold");
    pdf.text("HIAB DELIVERY SITE PLAN", pageWidth / 2, y, { align: "center" });
    y += 10;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text("Drop-off Location & Details", pageWidth / 2, y, { align: "center" });
    y += 8;

    // Delivery Information
    checkBreak(50);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Delivery Information", 15, y);
    y += 8;
    pdf.setFontSize(10);

    const infoRows = [
      ["Driver Name:", data.driverName],
      ["Client Name:", data.clientName],
      ["Client Address:", data.clientAddress],
      ["Delivery Date:", new Date(data.date).toLocaleDateString()],
    ];
    infoRows.forEach(([label, value]) => {
      pdf.setFont("helvetica", "bold");
      pdf.text(label, 15, y);
      pdf.setFont("helvetica", "normal");
      pdf.text(value, 55, y);
      y += 7;
    });
    y += 3;

    // Load Details
    checkBreak(30);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Load Details", 15, y);
    y += 8;
    pdf.setFontSize(10);

    pdf.setFont("helvetica", "bold");
    pdf.text("Description:", 15, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(data.loadDescription, 55, y);
    y += 7;
    pdf.setFont("helvetica", "bold");
    pdf.text("Weight:", 15, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${data.weight} kg`, 55, y);
    y += 10;

    // Site Plan image
    const imgData = canvas.toDataURL("image/png");
    const maxW = pageWidth - margin * 2;
    const maxH = 130;
    let iw = canvas.width;
    let ih = canvas.height;
    const scaleW = maxW / iw;
    const scaleH = maxH / ih;
    const scale = Math.min(scaleW, scaleH);
    iw = iw * scale;
    ih = ih * scale;

    checkBreak(ih + 15);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Site Plan", 15, y);
    y += 7;
    pdf.addImage(imgData, "PNG", (pageWidth - iw) / 2, y, iw, ih);
    y += ih + 10;

    // Annotations summary
    checkBreak(35);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Annotations:", 15, y);
    y += 7;
    pdf.setFont("helvetica", "normal");
    pdf.text(`Drop Zones: ${designPlan.dropZones.length}`, 20, y); y += 7;
    pdf.text(`Cones: ${designPlan.cones.length}`, 20, y); y += 7;
    pdf.text(`Lines: ${designPlan.lines.length}`, 20, y); y += 10;

    // Access Notes
    if (data.accessNotes) {
      const lines = pdf.splitTextToSize(data.accessNotes, pageWidth - 30);
      checkBreak(lines.length * 5 + 20);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Access Notes:", 15, y);
      y += 7;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(lines, 15, y);
      y += lines.length * 5 + 8;
    }

    // Special Instructions
    if (data.specialInstructions) {
      const lines = pdf.splitTextToSize(data.specialInstructions, pageWidth - 30);
      checkBreak(lines.length * 5 + 20);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Special Instructions:", 15, y);
      y += 7;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(lines, 15, y);
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

    pdf.save(`Hiab-Site-Plan-${data.clientName.replace(/\s/g, "-")}.pdf`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    updateFormData(formData);
    setGenerating(true);
    try {
      await generatePDF(formData);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Error generating PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleBack = () => {
    updateFormData(formData);
    navigate("/design-plan");
  };

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>Delivery Details</h1>
        <p>Step 3: Fill in the delivery information</p>
      </div>

      <form onSubmit={handleSubmit} className="delivery-form">
        <div className="form-section">
          <h2>Basic Information</h2>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="driverName">
                Driver Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="driverName"
                name="driverName"
                value={formData.driverName}
                onChange={handleChange}
                placeholder="John Smith"
                className={errors.driverName ? "error" : ""}
              />
              {errors.driverName && <span className="error-message">{errors.driverName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="clientName">
                Client Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="clientName"
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                placeholder="ABC Construction Ltd"
                className={errors.clientName ? "error" : ""}
              />
              {errors.clientName && <span className="error-message">{errors.clientName}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="clientAddress">
              Client Address <span className="required">*</span>
            </label>
            <input
              type="text"
              id="clientAddress"
              name="clientAddress"
              value={formData.clientAddress}
              onChange={handleChange}
              placeholder="123 Main Street, Hamilton"
              className={errors.clientAddress ? "error" : ""}
            />
            {errors.clientAddress && <span className="error-message">{errors.clientAddress}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="date">
              Delivery Date <span className="required">*</span>
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className={errors.date ? "error" : ""}
            />
            {errors.date && <span className="error-message">{errors.date}</span>}
          </div>
        </div>

        <div className="form-section">
          <h2>Load Details</h2>

          <div className="form-group">
            <label htmlFor="loadDescription">
              Load Description <span className="required">*</span>
            </label>
            <input
              type="text"
              id="loadDescription"
              name="loadDescription"
              value={formData.loadDescription}
              onChange={handleChange}
              placeholder="Steel beams, 6m length"
              className={errors.loadDescription ? "error" : ""}
            />
            {errors.loadDescription && <span className="error-message">{errors.loadDescription}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="weight">
              Load Weight (kg) <span className="required">*</span>
            </label>
            <input
              type="number"
              id="weight"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              placeholder="2500"
              min="0"
              step="0.01"
              className={errors.weight ? "error" : ""}
            />
            {errors.weight && <span className="error-message">{errors.weight}</span>}
          </div>
        </div>

        <div className="form-section">
          <h2>Additional Information</h2>

          <div className="form-group">
            <label htmlFor="accessNotes">
              Access Notes <span className="optional">(Optional)</span>
            </label>
            <textarea
              id="accessNotes"
              name="accessNotes"
              value={formData.accessNotes}
              onChange={handleChange}
              placeholder="Gate code: 1234, Narrow entrance, Low overhead wires..."
              rows="3"
            />
            <span className="help-text">Include gate codes, restrictions, hazards, etc.</span>
          </div>

          <div className="form-group">
            <label htmlFor="specialInstructions">
              Special Instructions <span className="optional">(Optional)</span>
            </label>
            <textarea
              id="specialInstructions"
              name="specialInstructions"
              value={formData.specialInstructions}
              onChange={handleChange}
              placeholder="Contact site manager on arrival, Drop on north side only..."
              rows="3"
            />
            <span className="help-text">Any specific requirements or contacts</span>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={handleBack}>
            ← Back to Design Plan
          </button>
          <button type="submit" className="btn btn-primary" disabled={generating}>
            {generating ? "Generating PDF..." : "Generate PDF"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeliveryForm;

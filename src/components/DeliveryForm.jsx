import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { useDelivery } from "../context/DeliveryContext";
import cartersLogo from "../assets/Carters_Horizontal_transparent.png";
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
  const { accounts } = useMsal();
  const {
    formData: contextFormData,
    updateFormData,
    designPlan,
    mapScreenshot,
  } = useDelivery();

  const userName = accounts[0]?.name || accounts[0]?.username || "";
  const [formData, setFormData] = useState({
    ...contextFormData,
    driverName: contextFormData.driverName || userName,
  });
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
    const pageW = pdf.internal.pageSize.getWidth();   // 210
    const pageH = pdf.internal.pageSize.getHeight();  // 297
    const margin = 10;

    // Two-column layout
    const leftW = 82;
    const gap = 6;
    const rightX = margin + leftW + gap;
    const rightW = pageW - rightX - margin;           // ~102mm

    // ── Header ──────────────────────────────────────────────────────────────
    // Carter's logo (left-aligned)
    const logoImg = await loadImage(cartersLogo);
    if (logoImg) {
      const logoH = 10;
      const logoW = logoH * (logoImg.naturalWidth / logoImg.naturalHeight);
      const c = document.createElement("canvas");
      c.width = logoImg.naturalWidth;
      c.height = logoImg.naturalHeight;
      c.getContext("2d").drawImage(logoImg, 0, 0);
      pdf.addImage(c.toDataURL("image/png"), "PNG", margin, margin, logoW, logoH);
    }

    // Title (right-aligned in header)
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(31, 41, 55);
    pdf.text("HIAB DELIVERY SITE PLAN", pageW - margin, margin + 6, { align: "right" });
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(107, 114, 128);
    pdf.text("Drop-off Location & Details", pageW - margin, margin + 11, { align: "right" });

    // Divider under header
    const headerH = 24;
    pdf.setDrawColor(220, 220, 220);
    pdf.line(margin, margin + headerH, pageW - margin, margin + headerH);

    // ── Content starts here ──────────────────────────────────────────────────
    const contentTop = margin + headerH + 5;
    const contentH = pageH - contentTop - 14; // leave room for footer
    let leftY = contentTop;

    const sectionTitle = (title) => {
      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(107, 114, 128);
      pdf.text(title.toUpperCase(), margin, leftY);
      leftY += 3.5;
      pdf.setDrawColor(220, 220, 220);
      pdf.line(margin, leftY, margin + leftW, leftY);
      leftY += 4;
    };

    const field = (label, value) => {
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(107, 114, 128);
      pdf.text(label, margin, leftY);
      leftY += 3.5;
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(8.5);
      const wrapped = pdf.splitTextToSize(value || "—", leftW);
      pdf.text(wrapped, margin, leftY);
      leftY += wrapped.length * 4.2 + 3;
    };

    // Delivery info
    sectionTitle("Delivery Information");
    field("Driver Name", data.driverName);
    field("Client Name", data.clientName);
    field("Client Address", data.clientAddress);
    field("Delivery Date", new Date(data.date).toLocaleDateString("en-NZ", { day: "2-digit", month: "long", year: "numeric" }));

    leftY += 2;
    sectionTitle("Load Details");
    field("Description", data.loadDescription);
    field("Weight", `${data.weight} kg`);

    leftY += 2;
    sectionTitle("Annotations");
    field("Drop Zones", `${designPlan.dropZones.length}`);
    field("Cones", `${designPlan.cones.length}`);
    field("Lines", `${designPlan.lines.length}`);

    if (data.accessNotes) {
      leftY += 2;
      sectionTitle("Access Notes");
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(31, 41, 55);
      const noteLines = pdf.splitTextToSize(data.accessNotes, leftW);
      pdf.text(noteLines, margin, leftY);
      leftY += noteLines.length * 4.2 + 3;
    }

    if (data.specialInstructions) {
      leftY += 2;
      sectionTitle("Special Instructions");
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(31, 41, 55);
      const instrLines = pdf.splitTextToSize(data.specialInstructions, leftW);
      pdf.text(instrLines, margin, leftY);
    }

    // ── Right column: site plan image ────────────────────────────────────────
    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(107, 114, 128);
    pdf.text("SITE PLAN", rightX, contentTop - 1);
    pdf.setDrawColor(220, 220, 220);
    pdf.line(rightX, contentTop + 2.5, rightX + rightW, contentTop + 2.5);

    const imgData = canvas.toDataURL("image/png");
    const imgAreaTop = contentTop + 6;
    const imgAreaH = contentH - 6;
    let iw = canvas.width;
    let ih = canvas.height;
    const scale = Math.min(rightW / iw, imgAreaH / ih);
    iw *= scale;
    ih *= scale;
    const imgX = rightX + (rightW - iw) / 2;
    const imgY = imgAreaTop + (imgAreaH - ih) / 2;
    pdf.addImage(imgData, "PNG", imgX, imgY, iw, ih);

    // Thin border around the image
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(imgX, imgY, iw, ih);

    // ── Footer ───────────────────────────────────────────────────────────────
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Generated ${new Date().toLocaleString()} | HIAB Site Planner — Carter's`,
      pageW / 2,
      pageH - 5,
      { align: "center" }
    );

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

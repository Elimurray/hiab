import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { useDelivery } from "../context/DeliveryContext";
import cartersLogo from "../assets/Carters_Horizontal_transparent.png";
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

// Draws wrapped text, returns the new Y position after the last line
const wrapText = (ctx, text, x, y, maxW, lineH) => {
  const words = (text || "—").split(" ");
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      y += lineH;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineH;
  }
  return y;
};

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
  const [imageDataUrl, setImageDataUrl] = useState(null);

  useEffect(() => {
    if (
      !designPlan.truck ||
      !designPlan.dropZones.length ||
      !designPlan.loadArrow ||
      !designPlan.driver ||
      !designPlan.windArrow
    ) {
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

    if (designPlan.site) {
      drawIcon("site", designPlan.site.x, designPlan.site.y, designPlan.site.size || 200, designPlan.site.rotation || 0);
    }
    if (designPlan.truck) {
      drawIcon("truck", designPlan.truck.x, designPlan.truck.y, designPlan.truck.size || 100, designPlan.truck.rotation || 0);
    }

    designPlan.cones.forEach((cone) => {
      ctx.fillStyle = "#e67b16";
      ctx.beginPath();
      ctx.arc(cone.x, cone.y, 15, 0, 2 * Math.PI);
      ctx.fill();
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
      drawIcon("loadArrow", designPlan.loadArrow.x, designPlan.loadArrow.y, 100, designPlan.loadArrow.rotation);
    }
    if (designPlan.driver) {
      drawIcon("driver", designPlan.driver.x, designPlan.driver.y, 60, 0);
    }
    if (designPlan.windArrow) {
      drawIcon("windArrow", designPlan.windArrow.x, designPlan.windArrow.y, 200, designPlan.windArrow.rotation);
    }

    return canvas;
  };

  const generateImage = async (data) => {
    const mapCanvas = await buildAnnotatedCanvas();

    // Canvas dimensions (×2 for retina sharpness)
    const SCALE = 2;
    const W = 1200;
    const H = 1700;

    const canvas = document.createElement("canvas");
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    const ctx = canvas.getContext("2d");
    ctx.scale(SCALE, SCALE);

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    const margin = 40;

    // ── Header ────────────────────────────────────────────────────────────────
    const logoImg = await loadImage(cartersLogo);
    if (logoImg) {
      const logoH = 44;
      const logoW = logoH * (logoImg.naturalWidth / logoImg.naturalHeight);
      ctx.drawImage(logoImg, margin, margin, logoW, logoH);
    }

    ctx.textAlign = "right";
    ctx.fillStyle = "#1F2937";
    ctx.font = "bold 26px Arial";
    ctx.fillText("HIAB DELIVERY SITE PLAN", W - margin, margin + 22);
    ctx.fillStyle = "#6B7280";
    ctx.font = "15px Arial";
    ctx.fillText("Drop-off Location & Details", W - margin, margin + 44);
    ctx.textAlign = "left";

    const headerBottom = margin + 60;
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(margin, headerBottom);
    ctx.lineTo(W - margin, headerBottom);
    ctx.stroke();

    // ── Two-column layout ──────────────────────────────────────────────────────
    const contentTop = headerBottom + 24;
    const leftW = 300;
    const gap = 28;
    const rightX = margin + leftW + gap;
    const rightW = W - rightX - margin;

    let leftY = contentTop;

    const sectionTitle = (title) => {
      ctx.fillStyle = "#6B7280";
      ctx.font = "bold 11px Arial";
      ctx.fillText(title.toUpperCase(), margin, leftY);
      leftY += 8;
      ctx.strokeStyle = "#E5E7EB";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin, leftY);
      ctx.lineTo(margin + leftW, leftY);
      ctx.stroke();
      leftY += 16;
    };

    const field = (label, value) => {
      ctx.fillStyle = "#6B7280";
      ctx.font = "bold 10px Arial";
      ctx.fillText(label, margin, leftY);
      leftY += 16;
      ctx.fillStyle = "#1F2937";
      ctx.font = "14px Arial";
      leftY = wrapText(ctx, value, margin, leftY, leftW, 20);
      leftY += 10;
    };

    sectionTitle("Delivery Information");
    field("Driver Name", data.driverName);
    field("Client Name", data.clientName);
    field("Client Address", data.clientAddress);
    field("Delivery Date", new Date(data.date).toLocaleDateString("en-NZ", { day: "2-digit", month: "long", year: "numeric" }));

    leftY += 8;
    sectionTitle("Load Details");
    field("Description", data.loadDescription);
    field("Weight", `${data.weight} kg`);

    leftY += 8;
    sectionTitle("Annotations");
    field("Drop Zones", `${designPlan.dropZones.length}`);
    field("Cones", `${designPlan.cones.length}`);
    field("Lines", `${designPlan.lines.length}`);

    if (data.accessNotes) {
      leftY += 8;
      sectionTitle("Access Notes");
      ctx.fillStyle = "#1F2937";
      ctx.font = "13px Arial";
      leftY = wrapText(ctx, data.accessNotes, margin, leftY, leftW, 19);
    }

    if (data.specialInstructions) {
      leftY += 8;
      sectionTitle("Special Instructions");
      ctx.fillStyle = "#1F2937";
      ctx.font = "13px Arial";
      leftY = wrapText(ctx, data.specialInstructions, margin, leftY, leftW, 19);
    }

    // ── Right column: site plan image ─────────────────────────────────────────
    ctx.fillStyle = "#6B7280";
    ctx.font = "bold 11px Arial";
    ctx.fillText("SITE PLAN", rightX, contentTop - 4);
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rightX, contentTop + 4);
    ctx.lineTo(rightX + rightW, contentTop + 4);
    ctx.stroke();

    const imgTop = contentTop + 18;
    const imgAreaH = H - imgTop - 60;
    let iw = mapCanvas.width;
    let ih = mapCanvas.height;
    const imgScale = Math.min(rightW / iw, imgAreaH / ih);
    iw *= imgScale;
    ih *= imgScale;
    const imgX = rightX + (rightW - iw) / 2;
    const imgY = imgTop + (imgAreaH - ih) / 2;
    ctx.drawImage(mapCanvas, imgX, imgY, iw, ih);

    ctx.strokeStyle = "#D1D5DB";
    ctx.lineWidth = 1;
    ctx.strokeRect(imgX, imgY, iw, ih);

    // ── Footer ────────────────────────────────────────────────────────────────
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      `Generated ${new Date().toLocaleString()} | HIAB Site Planner — Carter's`,
      W / 2,
      H - 22
    );
    ctx.textAlign = "left";

    return canvas.toDataURL("image/png");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    updateFormData(formData);
    setGenerating(true);
    try {
      const dataUrl = await generateImage(formData);
      setImageDataUrl(dataUrl);
    } catch (err) {
      console.error("Image generation failed:", err);
      alert("Error generating image. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    const link = document.createElement("a");
    link.download = `Hiab-Site-Plan-${formData.clientName.replace(/\s+/g, "-")}.png`;
    link.href = imageDataUrl;
    link.click();
  };

  const handleBack = () => {
    updateFormData(formData);
    navigate("/design-plan");
  };

  // ── Image preview overlay ──────────────────────────────────────────────────
  if (imageDataUrl) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    return (
      <div className="image-preview-overlay">
        <div className="image-preview-card">
          <h2 className="image-preview-title">Site Plan Ready</h2>

          {isIOS && (
            <p className="image-preview-hint image-preview-hint--top">
              Hold down the image below and tap <strong>Save to Photos</strong>.
            </p>
          )}

          <div className="image-preview-wrapper">
            <img src={imageDataUrl} alt="Generated site plan" className="image-preview-img" />
          </div>

          {!isIOS && (
            <button className="btn btn-save" onClick={handleSave}>
              Save Image
            </button>
          )}

          <button
            className="btn btn-secondary image-preview-back"
            onClick={() => setImageDataUrl(null)}
          >
            ← Back to Form
          </button>
        </div>
      </div>
    );
  }

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
            {generating ? "Generating..." : "Generate Image"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeliveryForm;

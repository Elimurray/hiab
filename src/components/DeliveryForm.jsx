import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { useDelivery } from "../context/DeliveryContext";
import cartersLogo from "../assets/Carters_Horizontal_transparent.png";
import truckIcon from "../utils/truck.svg";
import coneIcon from "../utils/cone.svg";
import driverIcon from "../utils/driver.svg";
import loadArrowIcon from "../utils/loadArrow.svg";
import windArrowIcon from "../utils/wind.png";
import siteIcon from "../utils/site.svg";
import "./DeliveryForm.css";

const HAZARDS = [
  { id: "incline", label: "Truck parked on incline/decline > 5°" },
  { id: "stabSpace", label: "Restricted space for stabiliser legs" },
  { id: "stabGround", label: "Ground unsuitable for stabiliser legs" },
  { id: "weather", label: "Unsuitable weather conditions" },
  {
    id: "overheadLines",
    label: "Overhead lines within 4m",
    note: "Controls must include verification of Close Approach Consent",
  },
  {
    id: "liftingOver",
    label: "Lifting over buildings / vehicles",
    note: "Controls must include a check of the building and/or vehicle for occupancy prior to the lift",
  },
  {
    id: "truckDeck",
    label: "Accessing the truck deck / scaffold / product",
    note: "Controls must include not working from the truck deck when operating the crane",
  },
  { id: "awkwardLoad", label: "Awkward to secure product" },
  { id: "overweight", label: "Loads overweight for crane limit" },
  {
    id: "roadBerm",
    label: "Truck parked on road / berm",
    note: "Controls must include consideration for traffic management",
  },
  {
    id: "footpath",
    label: "Truck parked on footpath or lifting over footpath",
    note: "Controls must include cones & signage to temporarily close the footpath, warn people of the lift in progress, and restrict access during the lift",
  },
  {
    id: "publicArea",
    label: "Potential for general public or other workers to enter the area",
    note: "Controls must include using a spotter or cones and barrier tape to exclude people from the lift area",
  },
];

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

  const handleNumberOfPeopleChange = (e) => {
    const num = Math.max(0, parseInt(e.target.value) || 0);
    setFormData((prev) => {
      const current = prev.liftPersonnel || [];
      let newPersonnel;
      if (num > current.length) {
        newPersonnel = [
          ...current,
          ...Array(num - current.length)
            .fill(null)
            .map(() => ({ name: "", role: "" })),
        ];
      } else {
        newPersonnel = current.slice(0, num);
      }
      return {
        ...prev,
        numberOfPeople: e.target.value,
        liftPersonnel: newPersonnel,
      };
    });
  };

  const handleHazardChange = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      hazards: {
        ...prev.hazards,
        [id]: {
          checked: null,
          controls: "",
          ...(prev.hazards[id] || {}),
          [field]: value,
        },
      },
    }));
  };

  const handlePersonnelChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.liftPersonnel || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, liftPersonnel: updated };
    });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.driverName.trim())
      newErrors.driverName = "Driver name is required";
    if (!formData.clientName.trim())
      newErrors.clientName = "Client name is required";
    if (!formData.clientAddress.trim())
      newErrors.clientAddress = "Client address is required";
    if (!formData.despatchNote.trim())
      newErrors.despatchNote = "Despatch note # is required";
    if (!formData.date) newErrors.date = "Delivery date is required";
    if (!formData.loadDescription.trim())
      newErrors.loadDescription = "Load description is required";
    if (!formData.weight || formData.weight <= 0)
      newErrors.weight = "Valid weight is required";
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
      Object.entries(ICON_SRCS).map(async ([key, src]) => [
        key,
        await loadImage(src),
      ]),
    );
    const icons = Object.fromEntries(
      iconEntries.filter(([, img]) => img !== null),
    );

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
      drawIcon(
        "site",
        designPlan.site.x,
        designPlan.site.y,
        designPlan.site.size || 200,
        designPlan.site.rotation || 0,
      );
    }
    if (designPlan.truck) {
      drawIcon(
        "truck",
        designPlan.truck.x,
        designPlan.truck.y,
        designPlan.truck.size || 100,
        designPlan.truck.rotation || 0,
      );
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
      ctx.font = "18px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(zone.number.toString(), zone.x, zone.y);
    });

    if (designPlan.loadArrow) {
      drawIcon(
        "loadArrow",
        designPlan.loadArrow.x,
        designPlan.loadArrow.y,
        100,
        designPlan.loadArrow.rotation,
      );
    }
    if (designPlan.driver) {
      drawIcon("driver", designPlan.driver.x, designPlan.driver.y, 60, 0);
    }
    if (designPlan.windArrow) {
      drawIcon(
        "windArrow",
        designPlan.windArrow.x,
        designPlan.windArrow.y,
        200,
        designPlan.windArrow.rotation,
      );
    }

    return canvas;
  };

  const generateImage = async (data) => {
    const mapCanvas = await buildAnnotatedCanvas();

    // Canvas dimensions — landscape (×2 for retina sharpness)
    const SCALE = 2;
    const W = 1920;
    const personnelCount = (data.liftPersonnel || []).length;
    const checkedHazards = HAZARDS.filter(
      (h) => data.hazards?.[h.id]?.checked === true,
    );
    // H is driven by the left column content height (ends at Annotations)
    const FIELD_H = 62; // label(22) + value line(22) + gap(18)
    const SEC_H = 24;   // section title overhead (8 divider + 16 gap)
    const leftColH =
      SEC_H + // Delivery Information
      4 * FIELD_H + // driver, client, address, despatch (required)
      (data.numberOfPeople ? FIELD_H : 0) +
      (data.liftPersonnel?.length || 0) * FIELD_H +
      (data.knownLiftWeights ? FIELD_H : 0) +
      FIELD_H + // date
      8 + SEC_H + 2 * FIELD_H + // gap + Load Details + description + weight
      8 + SEC_H + 2 * FIELD_H;  // gap + Annotations + drop zones + cones
    // contentTop = margin(40) + headerH(60) + gap(24) = 124
    const H = 124 + leftColH + 60;

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
    ctx.fillText("HIAB DELIVERY LIFT PLAN", W - margin, margin + 22);
    ctx.fillStyle = "#6B7280";
    ctx.font = "18px Arial";
    ctx.fillText("Drop-off Location & Details", W - margin, margin + 44);
    ctx.textAlign = "left";

    const headerBottom = margin + 60;
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(margin, headerBottom);
    ctx.lineTo(W - margin, headerBottom);
    ctx.stroke();

    // ── Three-column layout ────────────────────────────────────────────────────
    const contentTop = headerBottom + 24;
    const colGap = 30;
    const leftW = 420;
    const midX = margin + leftW + colGap; // 490
    const midW = 440;
    const rightX = midX + midW + colGap; // 960
    const rightW = W - rightX - margin; // 920

    let leftY = contentTop;
    let midY = contentTop;

    const sectionTitle = (title) => {
      ctx.fillStyle = "#6B7280";
      ctx.font = "bold 20px Arial";
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
      ctx.fillStyle = "#9CA3AF";
      ctx.font = "bold 13px Arial";
      ctx.fillText(label.toUpperCase(), margin, leftY);
      leftY += 22;
      ctx.fillStyle = "#1F2937";
      ctx.font = "18px Arial";
      leftY = wrapText(ctx, value, margin, leftY, leftW, 22);
      leftY += 18;
    };

    const midSectionTitle = (title) => {
      ctx.fillStyle = "#6B7280";
      ctx.font = "bold 20px Arial";
      ctx.fillText(title.toUpperCase(), midX, midY);
      midY += 8;
      ctx.strokeStyle = "#E5E7EB";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.lineTo(midX + midW, midY);
      ctx.stroke();
      midY += 16;
    };

    sectionTitle("Delivery Information");
    field("Driver Name", data.driverName);
    field("Client Name", data.clientName);
    field("Client Address", data.clientAddress);
    field("Despatch Note #", data.despatchNote);
    if (data.numberOfPeople) field("# of People", data.numberOfPeople);
    if (data.liftPersonnel && data.liftPersonnel.length > 0) {
      data.liftPersonnel.forEach((person, i) => {
        field(
          `Person ${i + 1}`,
          `${person.name || "—"}  –  ${person.role || "—"}`,
        );
      });
    }
    if (data.knownLiftWeights)
      field("Known Lift Weights", data.knownLiftWeights);
    field(
      "Delivery Date",
      new Date(data.date).toLocaleDateString("en-NZ", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    );

    leftY += 8;
    sectionTitle("Load Details");
    field("Description", data.loadDescription);
    field("Weight", `${data.weight} kg`);

    leftY += 8;
    sectionTitle("Annotations");
    field("Drop Zones", `${designPlan.dropZones.length}`);
    field("Cones", `${designPlan.cones.length}`);
    // field("Lines", `${designPlan.lines.length}`);

    // ── Middle column: notes & hazards ────────────────────────────────────────
    if (data.accessNotes) {
      midSectionTitle("Access Notes");
      ctx.fillStyle = "#1F2937";
      ctx.font = "18px Arial";
      midY = wrapText(ctx, data.accessNotes, midX, midY, midW, 22);
      midY += 18;
    }

    if (data.specialInstructions) {
      if (data.accessNotes) midY += 8;
      midSectionTitle("Special Instructions");
      ctx.fillStyle = "#1F2937";
      ctx.font = "18px Arial";
      midY = wrapText(ctx, data.specialInstructions, midX, midY, midW, 22);
      midY += 18;
    }

    if (checkedHazards.length > 0) {
      midY += 8;
      midSectionTitle("High-Risk Hazards");
      checkedHazards.forEach((hazard) => {
        ctx.fillStyle = "#b91c1c";
        ctx.font = "bold 18px Arial";
        midY = wrapText(ctx, "\u26A0 " + hazard.label, midX, midY, midW, 22);
        midY += 2;
        const controls = data.hazards[hazard.id].controls;
        if (controls) {
          ctx.fillStyle = "#374151";
          ctx.font = "16px Arial";
          midY = wrapText(ctx, "Controls: " + controls, midX, midY, midW, 20);
        }
        midY += 10;
      });
    }

    // ── Right column: lift plan image ─────────────────────────────────────────
    ctx.fillStyle = "#6B7280";
    ctx.font = "bold 20px Arial";
    ctx.fillText("LIFT PLAN", rightX, contentTop);
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rightX, contentTop + 8);
    ctx.lineTo(rightX + rightW, contentTop + 8);
    ctx.stroke();

    // ── Key / Legend ────────────────────────────────────────────────────────
    const keyIcons = Object.fromEntries(
      await Promise.all(
        Object.entries(ICON_SRCS).map(async ([k, src]) => [
          k,
          await loadImage(src),
        ]),
      ),
    );

    const keyTopY = contentTop + 24;
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "bold 11px Arial";
    ctx.fillText("KEY", rightX, keyTopY);

    const keyRowY = keyTopY + 16;
    const kIconSize = 26;
    const kCols = 3;
    const kColW = Math.floor(rightW / kCols);
    const kRowH = 38;

    const keyItems = [
      { draw: "icon", key: "truck", label: "Truck" },
      { draw: "icon", key: "driver", label: "Driver / Spotter" },
      { draw: "dropZone", label: "Drop Zone" },
      { draw: "cone", label: "Cone" },
      { draw: "icon", key: "loadArrow", label: "Load Direction" },
      { draw: "icon", key: "windArrow", label: "Wind Direction", darkBg: true },
      { draw: "line", label: "Lines" },
      ...(designPlan.site
        ? [{ draw: "icon", key: "site", label: "Site" }]
        : []),
    ];

    keyItems.forEach((item, idx) => {
      const col = idx % kCols;
      const row = Math.floor(idx / kCols);
      const kx = rightX + col * kColW;
      const ky = keyRowY + row * kRowH;
      const cy = ky + kIconSize / 2;

      if (item.draw === "icon") {
        if (item.darkBg) {
          ctx.fillStyle = "#374151";
          ctx.beginPath();
          ctx.arc(kx + kIconSize / 2, cy, kIconSize / 2 + 2, 0, 2 * Math.PI);
          ctx.fill();
        }
        const img = keyIcons[item.key];
        if (img) ctx.drawImage(img, kx, ky, kIconSize, kIconSize);
      } else if (item.draw === "dropZone") {
        ctx.fillStyle = "#EF4444";
        ctx.beginPath();
        ctx.arc(kx + kIconSize / 2, cy, 11, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText("1", kx + kIconSize / 2, cy + 4);
        ctx.textAlign = "left";
      } else if (item.draw === "cone") {
        ctx.fillStyle = "#e67b16";
        ctx.beginPath();
        ctx.arc(kx + kIconSize / 2, cy, 11, 0, 2 * Math.PI);
        ctx.fill();
      } else if (item.draw === "line") {
        ctx.strokeStyle = "#374151";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(kx + 2, cy);
        ctx.lineTo(kx + kIconSize - 2, cy);
        ctx.stroke();
        ctx.lineCap = "butt";
      }

      ctx.fillStyle = "#374151";
      ctx.font = "14px Arial";
      ctx.textAlign = "left";
      ctx.fillText(item.label, kx + kIconSize + 6, cy + 5);
    });

    // Thin separator below key
    const kRows = Math.ceil(keyItems.length / kCols);
    const keyBottomY = keyRowY + kRows * kRowH + 4;
    ctx.strokeStyle = "#F3F4F6";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rightX, keyBottomY);
    ctx.lineTo(rightX + rightW, keyBottomY);
    ctx.stroke();

    const imgTop = keyBottomY + 12;
    const mapMaxW = Math.min(rightW, 680);
    const mapMaxH = 640;
    let iw = mapCanvas.width;
    let ih = mapCanvas.height;
    const imgScale = Math.min(mapMaxW / iw, mapMaxH / ih);
    iw *= imgScale;
    ih *= imgScale;
    const imgX = rightX + (rightW - iw) / 2;
    const imgY = imgTop;
    ctx.drawImage(mapCanvas, imgX, imgY, iw, ih);

    ctx.strokeStyle = "#D1D5DB";
    ctx.lineWidth = 1;
    ctx.strokeRect(imgX, imgY, iw, ih);

    // ── Footer ────────────────────────────────────────────────────────────────
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      `Generated ${new Date().toLocaleString()} | HIAB Lift Planner — Carter's`,
      W / 2,
      H - 22,
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
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    return (
      <div className="image-preview-overlay">
        <div className="image-preview-card">
          <h2 className="image-preview-title">Lift Plan Ready</h2>

          {isIOS && (
            <p className="image-preview-hint image-preview-hint--top">
              Hold down the image below and tap <strong>Save to Photos</strong>.
            </p>
          )}

          <div className="image-preview-wrapper">
            <img
              src={imageDataUrl}
              alt="Generated lift plan"
              className="image-preview-img"
            />
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
              {errors.driverName && (
                <span className="error-message">{errors.driverName}</span>
              )}
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
              {errors.clientName && (
                <span className="error-message">{errors.clientName}</span>
              )}
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
            {errors.clientAddress && (
              <span className="error-message">{errors.clientAddress}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="despatchNote">
              Despatch Note # <span className="required">*</span>
            </label>
            <input
              type="text"
              id="despatchNote"
              name="despatchNote"
              value={formData.despatchNote}
              onChange={handleChange}
              placeholder="DN-12345"
              className={errors.despatchNote ? "error" : ""}
            />
            {errors.despatchNote && (
              <span className="error-message">{errors.despatchNote}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="numberOfPeople">
              # of People Involved in Delivery{" "}
              <span className="optional">(Optional)</span>
            </label>
            <input
              type="number"
              id="numberOfPeople"
              name="numberOfPeople"
              value={formData.numberOfPeople}
              onChange={handleNumberOfPeopleChange}
              placeholder="0"
              min="0"
              max="20"
            />
          </div>

          {(parseInt(formData.numberOfPeople) || 0) > 0 && (
            <div className="form-group">
              <label>Names &amp; Roles</label>
              {(formData.liftPersonnel || []).map((person, idx) => (
                <div key={idx} className="personnel-row">
                  <input
                    type="text"
                    value={person.name}
                    onChange={(e) =>
                      handlePersonnelChange(idx, "name", e.target.value)
                    }
                    placeholder="Name"
                  />
                  <input
                    type="text"
                    value={person.role}
                    onChange={(e) =>
                      handlePersonnelChange(idx, "role", e.target.value)
                    }
                    placeholder="Role (e.g. Crane Operator, Spotter)"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="knownLiftWeights">
              Known Lift Weights <span className="optional">(Optional)</span>
            </label>
            <input
              type="text"
              id="knownLiftWeights"
              name="knownLiftWeights"
              value={formData.knownLiftWeights}
              onChange={handleChange}
              placeholder="e.g. 2.5t main beam, 1.8t secondary"
            />
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
            {errors.date && (
              <span className="error-message">{errors.date}</span>
            )}
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
            {errors.loadDescription && (
              <span className="error-message">{errors.loadDescription}</span>
            )}
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
            {errors.weight && (
              <span className="error-message">{errors.weight}</span>
            )}
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
            <span className="help-text">
              Include gate codes, restrictions, hazards, etc.
            </span>
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
            <span className="help-text">
              Any specific requirements or contacts
            </span>
          </div>
        </div>

        <div className="form-section">
          <h2>High-Risk Hazards</h2>
          <p className="hazard-intro">
            Indicate all that apply. Refer to the Unloading Product on Site SOP
            for appropriate control measures, and enter control measures for
            every hazard marked&nbsp;Y.
          </p>

          <div className="hazard-col-headers">
            <span className="hazard-col-label">Hazard</span>
            <span className="hazard-col-yn">Y / N</span>
          </div>

          <div className="hazard-list">
            {HAZARDS.map((hazard) => {
              const state = formData.hazards?.[hazard.id] || {
                checked: null,
                controls: "",
              };
              return (
                <div key={hazard.id} className="hazard-item">
                  <div className="hazard-row">
                    <div className="hazard-label">
                      <span>{hazard.label}</span>
                      {hazard.note && (
                        <span className="hazard-note">{hazard.note}</span>
                      )}
                    </div>
                    <div className="hazard-toggle">
                      <button
                        type="button"
                        className={`hazard-btn${state.checked === true ? " hazard-yes" : ""}`}
                        onClick={() =>
                          handleHazardChange(
                            hazard.id,
                            "checked",
                            state.checked === true ? null : true,
                          )
                        }
                      >
                        Y
                      </button>
                      <button
                        type="button"
                        className={`hazard-btn${state.checked === false ? " hazard-no" : ""}`}
                        onClick={() =>
                          handleHazardChange(
                            hazard.id,
                            "checked",
                            state.checked === false ? null : false,
                          )
                        }
                      >
                        N
                      </button>
                    </div>
                  </div>
                  {state.checked === true && (
                    <textarea
                      className="hazard-controls"
                      placeholder="Enter control measures..."
                      value={state.controls}
                      onChange={(e) =>
                        handleHazardChange(
                          hazard.id,
                          "controls",
                          e.target.value,
                        )
                      }
                      rows={3}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleBack}
          >
            ← Back to Design Plan
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={generating}
          >
            {generating ? "Generating..." : "Generate Image"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeliveryForm;

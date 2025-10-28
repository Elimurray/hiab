import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDelivery } from "../context/DeliveryContext";
import truckIcon from "../utils/truck.svg";
import coneIcon from "../utils/cone.svg";
import driverIcon from "../utils/driver.svg";
import loadArrowIcon from "../utils/loadArrow.svg";
import windArrowIcon from "../utils/windArrow.svg";
import siteIcon from "../utils/site.svg";
import "./DesignPlan.css";

const DesignPlan = () => {
  const navigate = useNavigate();
  const {
    mapScreenshot,
    designPlan,
    updateDesignPlan,
    undoDesignPlan,
    canUndo,
  } = useDelivery();
  const canvasRef = useRef(null);
  const [tool, setTool] = useState(null); // Current tool: "truck", "cone", "line", "dropZone", "loadArrow", "driver", "windArrow"
  const [lineColor, setLineColor] = useState("#000000"); // Line color
  const [isDrawing, setIsDrawing] = useState(false); // Drawing state
  const [currentLine, setCurrentLine] = useState(null); // Current line points
  const [dropZoneCount, setDropZoneCount] = useState(1); // Counter for numbered drop zones
  const [error, setError] = useState(null);
  const iconImagesRef = useRef({}); // Store preloaded icon Image objects
  const [isFocused, setIsFocused] = useState(false);
  const isIOS = ["iPad", "iPhone", "iPod"].some((device) =>
    navigator.userAgent.includes(device)
  );
  const isAndroid = navigator.userAgent.includes("Android");

  // Define icons
  const icons = {
    truck: truckIcon,
    cone: coneIcon,
    driver: driverIcon,
    loadArrow: loadArrowIcon,
    windArrow: windArrowIcon,
    site: siteIcon,
  };

  // Preload icons
  useEffect(() => {
    Object.entries(icons).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        iconImagesRef.current[key] = img;
      };
      img.onerror = () => {
        console.error(`Failed to load icon: ${key} at ${src}`);
        setError(`Failed to load icon: ${key}`);
      };
    });
  }, []);

  // Prevent scrolling when focused
  useEffect(() => {
    if (isFocused) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isFocused]);

  // Initialize canvas and redraw when mapScreenshot or designPlan changes
  useEffect(() => {
    if (!mapScreenshot) {
      setError("No map screenshot available. Please select a map area first.");
      navigate("/");
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = mapScreenshot;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      redrawCanvas();
    };
    img.onerror = () => {
      console.error("Failed to load map screenshot");
      setError("Failed to load map screenshot");
    };
  }, [mapScreenshot, navigate]);

  // Redraw canvas with all annotations
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = mapScreenshot;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Draw lines
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

      // Draw current line being drawn
      if (currentLine && isDrawing) {
        ctx.beginPath();
        ctx.strokeStyle = currentLine.color;
        ctx.lineWidth = 3;
        currentLine.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      }

      // Draw icons
      const drawIcon = (key, x, y, size = 30, rotation = 0) => {
        const icon = iconImagesRef.current[key];
        if (!icon) {
          console.warn(`Icon not loaded: ${key}`);
          return;
        }
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(icon, -size / 2, -size / 2, size, size);
        ctx.restore();
      };

      // Draw site
      if (designPlan.site) {
        drawIcon(
          "site",
          designPlan.site.x,
          designPlan.site.y,
          designPlan.site.size || 200,
          designPlan.site.rotation || 0
        );
      }

      // Draw truck
      if (designPlan.truck) {
        drawIcon(
          "truck",
          designPlan.truck.x,
          designPlan.truck.y,
          designPlan.truck.size || 100,
          designPlan.truck.rotation || 0
        );
      }

      // Draw cones
      designPlan.cones.forEach((cone) => {
        ctx.fillStyle = "#e67b16ff";
        ctx.beginPath();
        ctx.arc(cone.x, cone.y, 15, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
      });

      // Draw drop zones
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

      // Draw load arrow
      if (designPlan.loadArrow) {
        drawIcon(
          "loadArrow",
          designPlan.loadArrow.x,
          designPlan.loadArrow.y,
          100,
          designPlan.loadArrow.rotation
        );
      }

      // Draw driver
      if (designPlan.driver) {
        drawIcon("driver", designPlan.driver.x, designPlan.driver.y, 60, 0);
      }

      // Draw wind arrow
      if (designPlan.windArrow) {
        drawIcon(
          "windArrow",
          designPlan.windArrow.x,
          designPlan.windArrow.y,
          200,
          designPlan.windArrow.rotation
        );
      }
    };
  }, [mapScreenshot, designPlan, currentLine, isDrawing]);

  // Redraw when designPlan changes
  useEffect(() => {
    redrawCanvas();
  }, [designPlan, redrawCanvas]);

  // Handle mouse down (start drawing or place icon)
  const handleMouseDown = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      if (tool === "line") {
        setIsDrawing(true);
        setCurrentLine({
          id: Date.now(),
          points: [{ x, y }],
          color: lineColor,
        });
      } else if (tool === "truck") {
        updateDesignPlan({
          truck: {
            x,
            y,
            rotation: designPlan.truck?.rotation || 0,
            size: designPlan.truck?.size || 100,
          },
        });
      } else if (tool === "cone") {
        updateDesignPlan({
          cones: [...designPlan.cones, { id: Date.now(), x, y }],
        });
      } else if (tool === "dropZone") {
        updateDesignPlan({
          dropZones: [
            ...designPlan.dropZones,
            { id: Date.now(), number: dropZoneCount, x, y },
          ],
        });
        setDropZoneCount(dropZoneCount + 1);
      } else if (tool === "loadArrow") {
        updateDesignPlan({
          loadArrow: { x, y, rotation: designPlan.loadArrow?.rotation || 0 },
        });
      } else if (tool === "driver") {
        updateDesignPlan({ driver: { x, y } });
      } else if (tool === "windArrow") {
        updateDesignPlan({
          windArrow: { x, y, rotation: designPlan.windArrow?.rotation || 0 },
        });
      } else if (tool === "site") {
        updateDesignPlan({
          site: {
            x,
            y,
            rotation: designPlan.site?.rotation || 0,
            size: designPlan.site?.size || 200,
          },
        });
      }
      redrawCanvas();
    },
    [tool, lineColor, designPlan, updateDesignPlan, dropZoneCount, redrawCanvas]
  );

  // Handle mouse move (drawing lines)
  const handleMouseMove = useCallback(
    (e) => {
      if (!isDrawing || tool !== "line") return;
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      setCurrentLine((prev) => ({
        ...prev,
        points: [...prev.points, { x, y }],
      }));
      redrawCanvas();
    },
    [isDrawing, tool, redrawCanvas]
  );

  // Handle mouse up (finish drawing)
  const handleMouseUp = useCallback(() => {
    if (isDrawing && currentLine) {
      updateDesignPlan({
        lines: [...designPlan.lines, currentLine],
      });
      setIsDrawing(false);
      setCurrentLine(null);
      redrawCanvas();
    }
  }, [isDrawing, currentLine, designPlan, updateDesignPlan, redrawCanvas]);

  // Handle rotation for arrows
  const handleRotationChange = (type, rotation) => {
    updateDesignPlan({ [type]: { ...designPlan[type], rotation } });
    redrawCanvas();
  };

  // Handle size for truck and site
  const handleSizeChange = (type, delta) => {
    const currentSize = designPlan[type]?.size || 100;
    const newSize = Math.max(150, Math.min(400, currentSize + delta)); // Clamp between 50 and 300
    updateDesignPlan({
      [type]: {
        ...designPlan[type],
        size: newSize,
      },
    });
    redrawCanvas();
  };

  // Handle reset
  const resetDesignPlan = () => {
    updateDesignPlan({
      truck: null,
      site: null,
      cones: [],
      lines: [],
      dropZones: [],
      loadArrow: null,
      driver: null,
      windArrow: null,
    });
    setDropZoneCount(1);
    redrawCanvas();
  };

  // Proceed to form
  const handleContinue = () => {
    if (
      !designPlan.truck ||
      !designPlan.dropZones.length ||
      !designPlan.loadArrow ||
      !designPlan.driver ||
      !designPlan.windArrow
    ) {
      setError(
        "Please add a truck, at least one drop zone, load arrow, driver position, and wind direction."
      );
      return;
    }
    navigate("/form");
  };

  // Replace your handleSaveImage and triggerDownload with this:
  const handleSaveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    const fileName = `hiab-site-plan-${
      new Date().toISOString().split("T")[0]
    }.png`;

    // iOS: Open image in new tab → triggers native "Save Image"
    if (isIOS) {
      const newWin = window.open("", "_blank");
      if (newWin) {
        newWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head><title>Hiab Site Plan</title></head>
          <body style="margin:0;background:#111;display:flex;justify-content:center;align-items:center;height:100vh;">
            <img src="${dataUrl}" style="max-width:100%;height:auto;" />
          </body>
        </html>
      `);
        newWin.document.close();

        // Fallback: hidden download link
        setTimeout(() => {
          const a = newWin.document.createElement("a");
          a.href = dataUrl;
          a.download = fileName;
          a.style.display = "none";
          newWin.document.body.appendChild(a);
          a.click();
        }, 100);
      }
      return;
    }

    // Android: Use native share (gives "Save Image")
    if (isAndroid && navigator.share) {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], fileName, { type: "image/png" });

        navigator
          .share({
            files: [file],
            title: "Hiab Site Plan",
            text: "Site plan design",
          })
          .catch(() => triggerDownload(dataUrl, fileName));
      }, "image/png");
      return;
    }

    // Desktop / fallback: direct download
    triggerDownload(dataUrl, fileName);
  };

  const triggerDownload = (dataUrl, fileName) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="design-plan-container">
      {!isFocused && (
        <>
          <div className="design-header">
            <h1>Hiab Site Planner - Design Plan</h1>
            <p>Step 2: Add annotations to the site plan</p>
          </div>

          <div className="instructions">
            <div className="instruction-box">
              <strong>Instructions:</strong> Click on the map to enter focus
              mode. Select a tool and click on the canvas to place items or draw
              lines. Adjust arrow rotations as needed.
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
        </>
      )}

      {isFocused && (
        <>
          <div className="focused-toolbar">
            <div className="toolbar-content">
              <button
                className={`btn btn-tool ${tool === "truck" ? "active" : ""}`}
                onClick={() => setTool("truck")}
                title="Truck"
              >
                <span className="btn-icon">🚛</span>
                <span className="btn-text">Truck</span>
              </button>
              <button
                className={`btn btn-tool ${tool === "cone" ? "active" : ""}`}
                onClick={() => setTool("cone")}
                title="Cone"
              >
                <span className="btn-icon">🗼</span>
                <span className="btn-text">Cone</span>
              </button>
              <button
                className={`btn btn-tool ${tool === "line" ? "active" : ""}`}
                onClick={() => setTool("line")}
                title="Draw Line"
              >
                <span className="btn-icon">✏️</span>
                <span className="btn-text">Draw Line</span>
              </button>
              {/* <select
                value={lineColor}
                onChange={(e) => setLineColor(e.target.value)}
                disabled={tool !== "line"}
                className="line-color-select"
                title="Line Color"
              >
                <option value="#000000">Black</option>
                <option value="#FF0000">Red</option>
                <option value="#00FF00">Green</option>
                <option value="#0000FF">Blue</option>
              </select> */}
              <button
                className={`btn btn-tool ${
                  tool === "dropZone" ? "active" : ""
                }`}
                onClick={() => setTool("dropZone")}
                title="Drop Zone"
              >
                <span className="btn-icon">📍</span>
                <span className="btn-text">Drop Zone</span>
              </button>
              <button
                className={`btn btn-tool ${
                  tool === "loadArrow" ? "active" : ""
                }`}
                onClick={() => setTool("loadArrow")}
                title="Load Arrow"
              >
                <span className="btn-icon">⬆️</span>
                <span className="btn-text">Load Arrow</span>
              </button>
              <button
                className={`btn btn-tool ${tool === "driver" ? "active" : ""}`}
                onClick={() => setTool("driver")}
                title="Driver"
              >
                <span className="btn-icon">👤</span>
                <span className="btn-text">Driver</span>
              </button>
              <button
                className={`btn btn-tool ${
                  tool === "windArrow" ? "active" : ""
                }`}
                onClick={() => setTool("windArrow")}
                title="Wind Arrow"
              >
                <span className="btn-icon">💨</span>
                <span className="btn-text">Wind Arrow</span>
              </button>
              <button
                className={`btn btn-tool ${tool === "site" ? "active" : ""}`}
                onClick={() => setTool("site")}
                title="Site"
              >
                <span className="btn-icon">🏢</span>
                <span className="btn-text">Site</span>
              </button>
            </div>
          </div>
        </>
      )}

      <div className={`canvas-wrapper ${isFocused ? "focused" : ""}`}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={() => !isFocused && setIsFocused(true)}
          style={{
            border: "1px solid #ccc",
            cursor: isFocused ? "crosshair" : "pointer",
          }}
        />
      </div>
      {isFocused && (
        <div className="bottom-container">
          {((tool === "loadArrow" && designPlan.loadArrow) ||
            (tool === "windArrow" && designPlan.windArrow) ||
            (tool === "site" && designPlan.site) ||
            (tool === "truck" && designPlan.truck)) && (
            <div className="rotation-panel">
              {tool === "truck" && designPlan.truck && (
                <>
                  <div className="rotation-item">
                    <label>Truck Direction</label>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="10"
                      value={designPlan.truck.rotation || 0}
                      onChange={(e) =>
                        handleRotationChange(
                          "truck",
                          parseFloat(e.target.value)
                        )
                      }
                      className="rotation-slider"
                    />
                    <span className="rotation-value">
                      {designPlan.truck.rotation || 0}°
                    </span>
                  </div>
                  <div className="rotation-item">
                    <label>Truck Size</label>
                    <input
                      type="range"
                      min="150"
                      max="400"
                      step="10"
                      value={designPlan.truck.size || 100}
                      onChange={(e) =>
                        handleSizeChange(
                          "truck",
                          parseFloat(e.target.value) -
                            (designPlan.truck?.size || 100)
                        )
                      }
                      className="size-slider"
                    />
                    <span className="rotation-value">
                      {designPlan.truck.size || 100}
                    </span>
                  </div>
                </>
              )}
              {tool === "site" && designPlan.site && (
                <>
                  <div className="rotation-item">
                    <label>Site Direction</label>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="10"
                      value={designPlan.site.rotation || 0}
                      onChange={(e) =>
                        handleRotationChange("site", parseFloat(e.target.value))
                      }
                      className="rotation-slider"
                    />
                    <span className="rotation-value">
                      {designPlan.site.rotation || 0}°
                    </span>
                  </div>
                  <div className="rotation-item">
                    <label>Site Size</label>
                    <input
                      type="range"
                      min="150"
                      max="400"
                      step="10"
                      value={designPlan.site.size || 100}
                      onChange={(e) =>
                        handleSizeChange(
                          "site",
                          parseFloat(e.target.value) -
                            (designPlan.site?.size || 100)
                        )
                      }
                      className="size-slider"
                    />
                    <span className="rotation-value">
                      {designPlan.site.size || 100}
                    </span>
                  </div>
                </>
              )}
              {tool === "loadArrow" && designPlan.loadArrow && (
                <div className="rotation-item">
                  <label>Load Arrow Direction</label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="10"
                    value={designPlan.loadArrow.rotation}
                    onChange={(e) =>
                      handleRotationChange(
                        "loadArrow",
                        parseFloat(e.target.value)
                      )
                    }
                    className="rotation-slider"
                  />
                  <span className="rotation-value">
                    {designPlan.loadArrow.rotation}°
                  </span>
                </div>
              )}
              {tool === "windArrow" && designPlan.windArrow && (
                <div className="rotation-item">
                  <label>Wind Arrow Direction</label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="10"
                    value={designPlan.windArrow.rotation}
                    onChange={(e) =>
                      handleRotationChange(
                        "windArrow",
                        parseFloat(e.target.value)
                      )
                    }
                    className="rotation-slider"
                  />
                  <span className="rotation-value">
                    {designPlan.windArrow.rotation}°
                  </span>
                </div>
              )}
            </div>
          )}
          {/* <div className="mobile-legend">
            <div className="legend-title">Legend:</div>
            <div className="legend-items">
              <span className="legend-item">🚛 Truck</span>
              <span className="legend-item">🗼 Cone</span>
              <span className="legend-item">✏️ Line</span>
              <span className="legend-item">📍 Drop Zone</span>
              <span className="legend-item">⬆️ Load Arrow</span>
              <span className="legend-item">👤 Driver</span>
              <span className="legend-item">💨 Wind</span>
              <span className="legend-item">🏢 Site</span>
            </div>
          </div> */}
          <div className="focused-footer">
            <button
              className="btn btn-secondary"
              onClick={undoDesignPlan}
              disabled={!canUndo}
            >
              Undo
            </button>
            <button className="btn btn-secondary" onClick={resetDesignPlan}>
              Reset
            </button>
            <button
              className="btn btn-close"
              onClick={() => setIsFocused(false)}
            >
              close
            </button>
          </div>
        </div>
      )}

      {!isFocused && (
        <div className="button-container">
          <button className="btn btn-secondary" onClick={() => navigate("/")}>
            ← Back to Map
          </button>
          <button className="btn btn-secondary" onClick={resetDesignPlan}>
            Reset Design
          </button>
          <button className="btn btn-secondary" onClick={handleSaveImage}>
            💾 Save Image
          </button>
          <button className="btn btn-primary" onClick={handleContinue}>
            Continue to Form →
          </button>
        </div>
      )}
    </div>
  );
};

export default DesignPlan;

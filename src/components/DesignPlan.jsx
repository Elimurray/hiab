import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDelivery } from "../context/DeliveryContext";
import truckIcon from "../utils/truck.svg";
import coneIcon from "../utils/cone.svg";
import driverIcon from "../utils/driver.svg";
import loadArrowIcon from "../utils/loadArrow.svg";
import windArrowIcon from "../utils/windArrow.svg";
import "./DesignPlan.css";

const DesignPlan = () => {
  const navigate = useNavigate();
  const { mapScreenshot, designPlan, updateDesignPlan } = useDelivery();
  const canvasRef = useRef(null);
  const [tool, setTool] = useState(null); // Current tool: "truck", "cone", "line", "dropZone", "loadArrow", "driver", "windArrow"
  const [lineColor, setLineColor] = useState("#000000"); // Line color
  const [isDrawing, setIsDrawing] = useState(false); // Drawing state
  const [currentLine, setCurrentLine] = useState(null); // Current line points
  const [dropZoneCount, setDropZoneCount] = useState(1); // Counter for numbered drop zones
  const [error, setError] = useState(null);
  const iconImagesRef = useRef({}); // Store preloaded icon Image objects

  // Define icons
  const icons = {
    truck: truckIcon,
    cone: coneIcon,
    driver: driverIcon,
    loadArrow: loadArrowIcon,
    windArrow: windArrowIcon,
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

      // Draw truck
      if (designPlan.truck) {
        drawIcon("truck", designPlan.truck.x, designPlan.truck.y, 100, 0);
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
      } else if (tool === "truck" && !designPlan.truck) {
        updateDesignPlan({ truck: { x, y } });
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
      } else if (tool === "loadArrow" && !designPlan.loadArrow) {
        updateDesignPlan({ loadArrow: { x, y, rotation: 0 } });
      } else if (tool === "driver" && !designPlan.driver) {
        updateDesignPlan({ driver: { x, y } });
      } else if (tool === "windArrow" && !designPlan.windArrow) {
        updateDesignPlan({ windArrow: { x, y, rotation: 0 } });
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

  // Handle reset
  const resetDesignPlan = () => {
    updateDesignPlan({
      truck: null,
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

  return (
    <div className="design-plan-container">
      <div className="design-header">
        <h1>Hiab Site Planner - Design Plan</h1>
        <p>Step 2: Add annotations to the site plan</p>
      </div>

      <div className="instructions">
        <div className="instruction-box">
          <strong>Instructions:</strong> Select a tool and click on the canvas
          to place items or draw lines. Adjust arrow rotations as needed.
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="toolbar">
        <button
          className={`btn btn-tool ${tool === "truck" ? "active" : ""}`}
          onClick={() => setTool("truck")}
        >
          Truck
        </button>
        <button
          className={`btn btn-tool ${tool === "cone" ? "active" : ""}`}
          onClick={() => setTool("cone")}
        >
          Cone
        </button>
        <button
          className={`btn btn-tool ${tool === "line" ? "active" : ""}`}
          onClick={() => setTool("line")}
        >
          Draw Line
        </button>
        <select
          value={lineColor}
          onChange={(e) => setLineColor(e.target.value)}
          disabled={tool !== "line"}
        >
          <option value="#000000">Black</option>
          <option value="#FF0000">Red</option>
          <option value="#00FF00">Green</option>
          <option value="#0000FF">Blue</option>
        </select>
        <button
          className={`btn btn-tool ${tool === "dropZone" ? "active" : ""}`}
          onClick={() => setTool("dropZone")}
        >
          Drop Zone
        </button>
        <button
          className={`btn btn-tool ${tool === "loadArrow" ? "active" : ""}`}
          onClick={() => setTool("loadArrow")}
        >
          Load Arrow
        </button>
        <button
          className={`btn btn-tool ${tool === "driver" ? "active" : ""}`}
          onClick={() => setTool("driver")}
        >
          Driver
        </button>
        <button
          className={`btn btn-tool ${tool === "windArrow" ? "active" : ""}`}
          onClick={() => setTool("windArrow")}
        >
          Wind Arrow
        </button>
        {tool === "loadArrow" && designPlan.loadArrow && (
          <div>
            <label>Load Arrow Rotation:</label>
            <input
              type="number"
              value={designPlan.loadArrow.rotation || 0}
              onChange={(e) =>
                handleRotationChange("loadArrow", Number(e.target.value))
              }
              min="0"
              max="360"
            />
          </div>
        )}
        {tool === "windArrow" && designPlan.windArrow && (
          <div>
            <label>Wind Arrow Rotation:</label>
            <input
              type="number"
              value={designPlan.windArrow.rotation || 0}
              onChange={(e) =>
                handleRotationChange("windArrow", Number(e.target.value))
              }
              min="0"
              max="360"
            />
          </div>
        )}
      </div>

      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ border: "1px solid #ccc" }}
        />
      </div>

      <div className="button-container">
        <button className="btn btn-secondary" onClick={() => navigate("/")}>
          ← Back to Map
        </button>
        <button className="btn btn-secondary" onClick={resetDesignPlan}>
          Reset Design
        </button>
        <button className="btn btn-primary" onClick={handleContinue}>
          Continue to Form →
        </button>
      </div>
    </div>
  );
};

export default DesignPlan;

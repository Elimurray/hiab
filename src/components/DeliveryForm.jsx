import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDelivery } from "../context/DeliveryContext"; // ADD THIS
import "./DeliveryForm.css";

const DeliveryForm = () => {
  const navigate = useNavigate();
  const { formData: contextFormData, updateFormData, markers } = useDelivery(); // ADD THIS

  // Initialize form with context data
  const [formData, setFormData] = useState(contextFormData);
  const [errors, setErrors] = useState({});

  // Check if markers exist, if not redirect to map
  useEffect(() => {
    if (!markers.truck || !markers.drop) {
      alert("Please place markers on the map first!");
      navigate("/");
    }
  }, [markers, navigate]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.driverName.trim()) {
      newErrors.driverName = "Driver name is required";
    }

    if (!formData.clientName.trim()) {
      newErrors.clientName = "Client name is required";
    }

    if (!formData.clientAddress.trim()) {
      newErrors.clientAddress = "Client address is required";
    }

    if (!formData.date) {
      newErrors.date = "Delivery date is required";
    }

    if (!formData.loadDescription.trim()) {
      newErrors.loadDescription = "Load description is required";
    }

    if (!formData.weight || formData.weight <= 0) {
      newErrors.weight = "Valid weight is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      // Save form data to context
      updateFormData(formData);
      console.log("Form data saved to context:", formData);
      navigate("/review");
    }
  };

  // Go back to map
  const handleBack = () => {
    // Save current form data to context before leaving
    updateFormData(formData);
    navigate("/");
  };

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>Delivery Details</h1>
        <p>Step 2: Fill in the delivery information</p>
      </div>

      <form onSubmit={handleSubmit} className="delivery-form">
        {/* Driver and Client Info Section */}
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

        {/* Load Details Section */}
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

        {/* Additional Notes Section */}
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

        {/* Buttons */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleBack}
          >
            ← Back to Map
          </button>
          <button type="submit" className="btn btn-primary">
            Review & Generate PDF →
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeliveryForm;

/**
 * ApprovalProofView Component
 * 
 * Displays a full-page approval proof with project details, design snapshot,
 * and digital signature capture. Allows in-person or remote approval.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useProjectMutations } from '../hooks/useProjectMutations';
import SignaturePad from '../components/ui/SignaturePad';
import Button from '../components/ui/Button';
import { colorData } from '../data/ColorData';
import { generateApprovalPDF } from '../utils/pdfGenerator';
import { uploadApprovalPDF, pdfBlobToBase64 } from '../utils/storageService';

const ApprovalProofView = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getProject, updateProject } = useProjectMutations();
  
  const [project, setProject] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: ''
  });
  const [designSnapshot, setDesignSnapshot] = useState(location.state?.designSnapshot || null);
  const [signature, setSignature] = useState(null);
  const [signerName, setSignerName] = useState('');
  const [signDate, setSignDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const approvalContainerRef = useRef(null);

  useEffect(() => {
    loadProject();
    
    // Enable scrolling on body when on approval page
    document.body.style.overflow = 'auto';
    
    // Cleanup: restore original overflow when component unmounts
    return () => {
      document.body.style.overflow = 'hidden';
    };
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getProject(projectId);
      if (result.success) {
        setProject(result.data);
        setProjectDetails(result.data.template || result.data.templates?.[0]);
        
        // Load customer information if available
        // For now, we'll use a placeholder or load from project customizations
        // In a full implementation, this would come from project_customers table
        
        // Design snapshot should come from location state (captured in DesignStudio)
        // If not available, we could try to regenerate, but it's better to navigate from DesignStudio
      } else {
        setError(result.error || 'Failed to load project');
      }
    } catch (err) {
      setError('Failed to load project');
      console.error('Error loading project:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureChange = (signatureData) => {
    setSignature(signatureData);
  };

  const handleSubmitApproval = async () => {
    if (!signature || !signerName.trim()) {
      alert('Please provide a signature and signer name');
      return;
    }

    if (!approvalContainerRef.current) {
      alert('Error: Cannot generate PDF. Please refresh the page and try again.');
      return;
    }

    try {
      setSaving(true);
      
      // Generate PDF from the approval proof container
      const pdfBlob = await generateApprovalPDF(
        approvalContainerRef.current,
        `approval-proof-${projectId}.pdf`
      );

      // Try to upload to Supabase Storage, fallback to base64 if storage not available
      let pdfUrl = null;
      try {
        pdfUrl = await uploadApprovalPDF(pdfBlob, projectId, `approval-proof-${projectId}.pdf`);
      } catch (storageError) {
        console.warn('Supabase Storage not available, storing PDF as base64:', storageError);
        // Fallback: Store as base64 in database (less ideal but works)
        const base64Pdf = await pdfBlobToBase64(pdfBlob);
        // Store base64 in a custom field or use a data URL
        pdfUrl = `data:application/pdf;base64,${base64Pdf}`;
      }

      // Update project status to approved and save PDF URL
      const updateResult = await updateProject(projectId, {
        status: 'approved',
        approvalPdfUrl: pdfUrl,
        lastEdited: new Date().toISOString()
      });

      if (!updateResult.success) {
        throw new Error('Failed to update project status');
      }

      // Save approval signature data
      const approvalData = {
        signature: signature,
        signerName: signerName,
        signDate: signDate
      };

      console.log('Approval submitted:', approvalData);

      // Navigate to approved view
      navigate(`/projects/${projectId}/approved`);
    } catch (err) {
      console.error('Error submitting approval:', err);
      alert('Failed to submit approval. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEmail = () => {
    if (!customer.email) {
      alert('Please enter customer email address');
      return;
    }

    // In a full implementation, this would:
    // 1. Generate a PDF of the proof
    // 2. Send email with PDF attachment via backend API
    // 3. Include a link for remote signature
    
    alert(`Email functionality will send the proof to ${customer.email}`);
    console.log('Email proof to:', customer.email);
  };

  const handlePrint = () => {
    // Generate PDF and trigger print dialog
    window.print();
  };

  const handleClose = () => {
    navigate(`/projects/${projectId}/edit`);
  };

  // Format dimensions for display
  const formatDimensions = (width, height, depth) => {
    const format = (val) => {
      if (!val) return '0-0';
      const feet = Math.floor(val / 12);
      const inches = val % 12;
      return `${feet}-${Math.round(inches)}`;
    };
    return `${format(width)} × ${format(depth)} × ${format(height)}`;
  };

  if (loading) {
    return (
      <div className="approval-proof-container">
        <div className="loading-message">Loading approval proof...</div>
      </div>
    );
  }

  if (error || !project || !projectDetails) {
    return (
      <div className="approval-proof-container">
        <div className="error-message">Error: {error || 'Project not found'}</div>
        <Button onClick={() => navigate('/projects')}>Back to Projects</Button>
      </div>
    );
  }

  // Extract project information
  const material = projectDetails.selectedMaterial || projectDetails.material;
  const productBase = projectDetails.productBase || [];
  const dimensions = formatDimensions(
    projectDetails.realWorldWidth,
    projectDetails.realWorldHeight,
    projectDetails.realWorldDepth || 0
  );

  // Extract unique font families from design elements
  const getFontFamilies = () => {
    const designElements = projectDetails.customizations?.designElements || 
                          projectDetails.designElements || 
                          [];
    
    // Get all font families from text elements
    const fonts = new Set();
    designElements.forEach(element => {
      if (element.type === 'text' || element.type === 'i-text' || element.type === 'textbox') {
        if (element.font) {
          fonts.add(element.font);
        }
      }
    });
    
    // Convert to sorted array and join with commas
    return Array.from(fonts).sort().join(', ') || 'No fonts specified';
  };

  // Extract unique color names from design elements
  const getColorNames = () => {
    const designElements = projectDetails.customizations?.designElements || 
                          projectDetails.designElements || 
                          [];
    
    const colorNames = new Set();
    
    designElements.forEach(element => {
      // Try to get color by colorId first (most reliable)
      if (element.colorId) {
        const colorItem = colorData.find(c => c.id === element.colorId);
        if (colorItem) {
          colorNames.add(colorItem.name);
        }
      }
      
      // Also check fill color by hex match
      if (element.fill) {
        const fillHex = element.fill.toUpperCase();
        const colorItem = colorData.find(c => {
          const colorHex = c.fillColor.toUpperCase();
          return colorHex === fillHex;
        });
        if (colorItem) {
          colorNames.add(colorItem.name);
        }
      }
      
      // Check stroke color
      if (element.stroke) {
        const strokeHex = element.stroke.toUpperCase();
        const colorItem = colorData.find(c => {
          const strokeColorHex = c.strokeColor.toUpperCase();
          return strokeColorHex === strokeHex && c.strokeWidth > 0;
        });
        if (colorItem) {
          colorNames.add(colorItem.name);
        }
      }
    });
    
    // Convert to sorted array and join with commas
    return Array.from(colorNames).sort().join(', ') || 'No colors specified';
  };

  const fontFamilies = getFontFamilies();
  const colorNames = getColorNames();

  return (
    <div className="approval-proof-container" ref={approvalContainerRef}>
      <div className="approval-proof-header">
        <h1 className="approval-proof-title">ARLINGTON MEMORIAL PARK</h1>
        <div className="approval-proof-actions">
          <Button
            variant="secondary"
            onClick={handlePrint}
            className="approval-action-btn"
          >
            Print
          </Button>
          <Button
            variant="secondary"
            onClick={handleEmail}
            className="approval-action-btn"
            disabled={!customer.email}
          >
            Email
          </Button>
          <button
            onClick={handleClose}
            className="approval-close-btn"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div className="approval-proof-content">
        {/* Left: Design Snapshot */}
        <div className="approval-proof-design">
          {designSnapshot ? (
            <img
              src={designSnapshot}
              alt="Design Proof"
              className="approval-design-image"
            />
          ) : (
            <div className="approval-design-placeholder">
              <p>Design snapshot will appear here</p>
              <p className="text-small">Note: Navigate from Design Studio to capture snapshot</p>
            </div>
          )}

              {/* Project Details */}
              <div className="approval-details-column">
                
                <div>
                  <div className="approval-detail-item">
                    <span className="approval-detail-label">Product:</span>
                    <span className="approval-detail-value">
                      {projectDetails.templateName || 'Estate Collection 1'}
                    </span>
                  </div>
                  
                  <div className="approval-detail-item">
                    <span className="approval-detail-label">Dimensions:</span>
                    <span className="approval-detail-value">{dimensions}</span>
                  </div>
                  
                  <div className="approval-detail-item">
                    <span className="approval-detail-label">Material:</span>
                    <span className="approval-detail-value">
                      {material?.name || 'Not specified'}
                    </span>
                  </div>
                </div>
                
                <div>
                  {productBase.length > 0 && (
                    <div className="approval-detail-item">
                      <span className="approval-detail-label">Base:</span>
                      <div className="approval-detail-value">
                        <div>Size: {formatDimensions(productBase[0]?.width, productBase[0]?.height, productBase[0]?.depth)}</div>
                        <div>{productBase[0]?.color || material?.name}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="approval-detail-item">
                    <span className="approval-detail-label">Vase:</span>
                    <span className="approval-detail-value">8" x 10" Turned</span>
                  </div>
                  
                  <div className="approval-detail-item">
                    <span className="approval-detail-label">Letter Style:</span>
                    <div className="approval-detail-value">
                      <div>{fontFamilies} V-Sunk</div>
                      
                    </div>
                  </div>
                  
                  <div className="approval-detail-item">
                    <span className="approval-detail-label">Type & Art Colors:</span>
                    <span className="approval-detail-value">{colorNames}</span>
                  </div>
                </div>

              </div>


        </div>



        {/* Right: Project Details and Approval */}
        <div className="approval-proof-details">
          {/* Project Details Panel */}
          <div className="approval-details-panel">
            <h2 className="approval-panel-title">{project.title}</h2>
            
            <div className="">

              {/* Right Column: Customer Details */}
              <div className="approval-details-column">

                  <div className="approval-detail-item">
                    <span className="approval-detail-label">Customer:</span>
                    <input
                        type="text"
                        value={customer.name}
                        onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                        className="approval-input"
                        placeholder="Customer Name"
                      />
                    <input
                        type="tel"
                        value={customer.phone}
                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                        className="approval-input"
                        placeholder="Phone Number"
                      />
                    <input
                        type="email"
                        value={customer.email}
                        onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                        className="approval-input"
                        placeholder="Email Address"
                      />
                </div>

      
                <div className="approval-detail-item">
                  <span className="approval-detail-label">Address:</span>
                  <input
                    type="text"
                    value={customer.address_line1}
                    onChange={(e) => setCustomer({ ...customer, address_line1: e.target.value })}
                    className="approval-input"
                    placeholder="Address"
                  />
                  <input
                    type="text"
                    value={customer.city}
                    onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                    className="approval-input approval-input-inline"
                    placeholder="City"
                  />
                  <input
                    type="text"
                    value={customer.state}
                    onChange={(e) => setCustomer({ ...customer, state: e.target.value })}
                    className="approval-input approval-input-inline"
                    placeholder="State"
                  />
                  <input
                    type="text"
                    value={customer.zip_code}
                    onChange={(e) => setCustomer({ ...customer, zip_code: e.target.value })}
                    className="approval-input approval-input-inline"
                    placeholder="Zip"
                  />
                </div>

             

              </div>
            </div>
          </div>

          {/* Approval Panel */}
          <div className="approval-signature-panel">
            <h2 className="approval-panel-title">Approval</h2>
            
            <div className="approval-signature-fields">

            <div style={{ display: 'flex', gap: '20px', justifyContent: 'space-between' }}>                
                <div className="approval-signature-field">
                  <label className="approval-field-label">Name:</label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="approval-field-input"
                    placeholder="Signer Name"
                  />
                </div>

                <div className="approval-signature-field">
                  <label className="approval-field-label">Date:</label>
                  <input
                    type="date"
                    value={signDate}
                    onChange={(e) => setSignDate(e.target.value)}
                    className="approval-field-input"
                  />
                </div>

              </div>

              
              <div className="approval-signature-field">
                <label className="approval-field-label">Signature:</label>
                <SignaturePad
                  onSignatureChange={handleSignatureChange}
                  width={600}
                  height={120}
                  backgroundColor="#FFFFFF"
                  penColor="#000000"
                  penWidth={2}
                />
              </div>
            </div>

            <div className="approval-submit-actions">
              <Button
                variant="primary"
                onClick={handleSubmitApproval}
                disabled={!signature || !signerName.trim() || saving}
                className="approval-submit-btn"
              >
                {saving ? 'Submitting...' : 'Submit Approval'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalProofView;


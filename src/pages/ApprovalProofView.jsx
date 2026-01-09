/**
 * ApprovalProofView Component
 * 
 * Displays a full-page approval proof with project details, design snapshot,
 * and digital signature capture. Allows in-person or remote approval.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation as useRouterLocation } from 'react-router-dom';
import { useProjectMutations } from '../hooks/useProjectMutations';
import productService from '../services/productService';
import SignaturePad from '../components/ui/SignaturePad';
import Button from '../components/ui/Button';
import { colorData } from '../data/ColorData';
import { generateApprovalPDF } from '../utils/pdfGenerator';
import { uploadApprovalPDF, pdfBlobToBase64 } from '../utils/storageService';
import { buildLocationPath } from '../utils/navigation';
import { useLocation } from '../context/LocationContext';

const ApprovalProofView = () => {
  const { projectId, locationSlug } = useParams();
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const { locationConfig } = useLocation();
  const { getProject, updateProject } = useProjectMutations();
  
  const [project, setProject] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [productData, setProductData] = useState(null);
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
  // Support both old format (single snapshot) and new format (multiple snapshots)
  const [designSnapshots, setDesignSnapshots] = useState(() => {
    // New format: object with view keys
    if (routerLocation.state?.designSnapshots) {
      console.log('ApprovalProofView: Received designSnapshots from routerLocation.state:', routerLocation.state.designSnapshots);
      console.log('ApprovalProofView: designSnapshots.front:', routerLocation.state.designSnapshots.front);
      console.log('ApprovalProofView: designSnapshots.back:', routerLocation.state.designSnapshots.back);
      return routerLocation.state.designSnapshots;
    }
    // Old format: single snapshot string (backward compatibility)
    if (routerLocation.state?.designSnapshot) {
      console.log('ApprovalProofView: Received designSnapshot (old format):', routerLocation.state.designSnapshot);
      return { front: routerLocation.state.designSnapshot };
    }
    console.warn('ApprovalProofView: No design snapshots found in routerLocation.state');
    return null;
  });
  const [hasMultipleViews, setHasMultipleViews] = useState(routerLocation.state?.hasMultipleViews || false);
  const [signature, setSignature] = useState(null);
  const [signerName, setSignerName] = useState('');
  const [signDate, setSignDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isPdfMode, setIsPdfMode] = useState(false); // Read-only mode for PDF generation
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
        const details = result.data.template || result.data.templates?.[0];
        setProjectDetails(details);
        
        // Load product data from database to get dimensions_for_display and other product info
        if (details?.templateId || details?.id) {
          const productId = details.templateId || details.id;
          const productResult = await productService.getProductById(productId);
          if (productResult.success && productResult.data) {
            setProductData(productResult.data);
          }
        }
        
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
      
      // Switch to PDF mode (read-only, no inputs/buttons)
      setIsPdfMode(true);
      
      // Wait for DOM to update with read-only version
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Ensure all images are fully loaded before capturing PDF
      const images = approvalContainerRef.current.querySelectorAll('img.approval-design-image');
      const imageLoadPromises = Array.from(images).map(img => {
        if (img.complete) {
          return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          // Timeout after 5 seconds
          setTimeout(() => resolve(), 5000);
        });
      });
      await Promise.all(imageLoadPromises);
      
      // Additional delay to ensure layout is stable
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Generate PDF from the clean read-only approval proof container
      const pdfBlob = await generateApprovalPDF(
        approvalContainerRef.current,
        `approval-proof-${projectId}.pdf`
      );
      
      // Switch back to normal mode
      setIsPdfMode(false);

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
      const approvedPath = buildLocationPath(`/projects/${projectId}/approved`, locationSlug);
      navigate(approvedPath);
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
    const editPath = buildLocationPath(`/projects/${projectId}/edit`, locationSlug);
    navigate(editPath);
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
        <Button onClick={() => navigate(buildLocationPath('/projects', locationSlug))}>Back to Projects</Button>
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
    const designElementsRaw = projectDetails.customizations?.designElements || 
                          projectDetails.designElements || 
                          [];
    
    // Handle new format (object with view keys) or old format (array)
    let designElements = [];
    if (Array.isArray(designElementsRaw)) {
      // Old format: array
      designElements = designElementsRaw;
    } else if (typeof designElementsRaw === 'object' && designElementsRaw !== null) {
      // New format: object with view keys (e.g., { "front": [...], "back": [...] })
      // Flatten all views' elements into a single array
      designElements = Object.values(designElementsRaw)
        .filter(Array.isArray) // Only keep arrays (ignore any non-array values)
        .flat(); // Flatten into a single array
    }
    
    // Get all font families from text elements
    const fonts = new Set();
    designElements.forEach(element => {
      if (element && (element.type === 'text' || element.type === 'i-text' || element.type === 'textbox')) {
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
    const designElementsRaw = projectDetails.customizations?.designElements || 
                          projectDetails.designElements || 
                          [];
    
    // Handle new format (object with view keys) or old format (array)
    let designElements = [];
    if (Array.isArray(designElementsRaw)) {
      // Old format: array
      designElements = designElementsRaw;
    } else if (typeof designElementsRaw === 'object' && designElementsRaw !== null) {
      // New format: object with view keys (e.g., { "front": [...], "back": [...] })
      // Flatten all views' elements into a single array
      designElements = Object.values(designElementsRaw)
        .filter(Array.isArray) // Only keep arrays (ignore any non-array values)
        .flat(); // Flatten into a single array
    }
    
    const colorNames = new Set();
    
    designElements.forEach(element => {
      if (!element) return;
      
      // Skip certain element types that shouldn't contribute to color names
      // - Panel artwork (has texture layers, not actual colors)
      // - Floral images (decorative, not part of design colors)
      const isPanelArtwork = element.category && element.category.toLowerCase() === 'panels';
      const isFloral = element.category && element.category.toLowerCase() === 'floral';
      const isTextureLayer = element.textureUrl || element.isTextureLayer;
      
      if (isPanelArtwork || isFloral || isTextureLayer) {
        return; // Skip these elements
      }
      
      // Try to get color by colorId first (most reliable)
      if (element.colorId) {
        const colorItem = colorData.find(c => c.id === element.colorId);
        if (colorItem) {
          colorNames.add(colorItem.name);
          return; // If we found color by colorId, don't check hex matches (avoid duplicates)
        }
      }
      
      // Also check fill color by hex match (only if no colorId was found)
      if (element.fill) {
        // Normalize fill color - handle rgb(), rgba(), and hex formats
        let fillHex = element.fill.toUpperCase();
        if (fillHex.startsWith('RGB')) {
          // Convert rgb/rgba to hex if needed
          const rgbMatch = fillHex.match(/\d+/g);
          if (rgbMatch && rgbMatch.length >= 3) {
            const r = parseInt(rgbMatch[0]).toString(16).padStart(2, '0');
            const g = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
            const b = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
            fillHex = `#${r}${g}${b}`;
          }
        }
        
        if (fillHex.startsWith('#')) {
          const colorItem = colorData.find(c => {
            const colorHex = c.fillColor.toUpperCase();
            return colorHex === fillHex;
          });
          if (colorItem) {
            colorNames.add(colorItem.name);
            return; // Found by fill, don't check stroke
          }
        }
      }
      
      // Check stroke color ONLY if element has a visible stroke (strokeWidth > 0)
      // This prevents matching colors based on default black strokes
      if (element.stroke && element.strokeWidth && element.strokeWidth > 0) {
        let strokeHex = element.stroke.toUpperCase();
        if (strokeHex.startsWith('RGB')) {
          // Convert rgb/rgba to hex if needed
          const rgbMatch = strokeHex.match(/\d+/g);
          if (rgbMatch && rgbMatch.length >= 3) {
            const r = parseInt(rgbMatch[0]).toString(16).padStart(2, '0');
            const g = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
            const b = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
            strokeHex = `#${r}${g}${b}`;
          }
        }
        
        if (strokeHex.startsWith('#')) {
          // Only match if the color data has a stroke width > 0 (indicating it's meant to be a stroke color)
          const colorItem = colorData.find(c => {
            const strokeColorHex = c.strokeColor.toUpperCase();
            return strokeColorHex === strokeHex && c.strokeWidth > 0;
          });
          if (colorItem) {
            colorNames.add(colorItem.name);
          }
        }
      }
    });
    
    // Convert to sorted array and join with commas
    return Array.from(colorNames).sort().join(', ') || 'No colors specified';
  };

  const fontFamilies = getFontFamilies();
  const colorNames = getColorNames();

  return (
    <div className={`approval-proof-container ${isPdfMode ? 'approval-pdf-mode' : ''}`} ref={approvalContainerRef}>
      {!isPdfMode && (
        <div className="approval-proof-header">
          <h1 className="approval-proof-title">{locationConfig?.approvalProofTitle || 'ARLINGTON MEMORIAL PARK'}</h1>
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
      )}
      {isPdfMode && (
        <div className="approval-proof-header">
          <h1 className="approval-proof-title">{locationConfig?.approvalProofTitle || 'ARLINGTON MEMORIAL PARK'}</h1>
        </div>
      )}

      <div className="approval-proof-content">
        {/* Left: Design Snapshot(s) */}
        <div className="approval-proof-design">
          {designSnapshots ? (
            <div className="approval-design-images">
              {/* Check if product has top view - show top snapshot or front snapshot with "Top View" label */}
              {designSnapshots.top ? (
                <div className="approval-design-view">
                  <div className="approval-view-label">Top View</div>
                  <img
                    src={designSnapshots.top}
                    alt="Top Design Proof"
                    className="approval-design-image"
                    style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                    onError={(e) => {
                      console.error('Failed to load top design snapshot image:', designSnapshots.top);
                      e.target.style.display = 'none';
                    }}
                    onLoad={(e) => {
                      console.log('Top design snapshot image loaded successfully');
                      // Ensure aspect ratio is maintained
                      const img = e.target;
                      if (img.naturalWidth && img.naturalHeight) {
                        const aspectRatio = img.naturalWidth / img.naturalHeight;
                        img.style.width = 'auto';
                        img.style.height = 'auto';
                        img.style.maxWidth = '100%';
                        img.style.maxHeight = '500px';
                      }
                    }}
                  />
                </div>
              ) : designSnapshots.front ? (
                <div className="approval-design-view">
                  <div className="approval-view-label">
                    {productData?.available_views?.includes('top') ? 'Top View' : 'Front View'}
                  </div>
                  <img
                    src={designSnapshots.front}
                    alt={productData?.available_views?.includes('top') ? 'Top Design Proof' : 'Front Design Proof'}
                    className="approval-design-image"
                    style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                    onError={(e) => {
                      console.error('Failed to load front design snapshot image:', designSnapshots.front);
                      e.target.style.display = 'none';
                    }}
                    onLoad={(e) => {
                      console.log('Front design snapshot image loaded successfully');
                      // Ensure aspect ratio is maintained
                      const img = e.target;
                      if (img.naturalWidth && img.naturalHeight) {
                        const aspectRatio = img.naturalWidth / img.naturalHeight;
                        img.style.width = 'auto';
                        img.style.height = 'auto';
                        img.style.maxWidth = '100%';
                        img.style.maxHeight = '500px';
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="approval-design-placeholder">
                  <p>{productData?.available_views?.includes('top') ? 'Top' : 'Front'} view snapshot not available</p>
                </div>
              )}
              {designSnapshots.back ? (
                <div className="approval-design-view">
                  <div className="approval-view-label">Back View</div>
                  <img
                    src={designSnapshots.back}
                    alt="Back Design Proof"
                    className="approval-design-image"
                    style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                    onError={(e) => {
                      console.error('Failed to load back design snapshot image:', designSnapshots.back);
                      e.target.style.display = 'none';
                    }}
                    onLoad={(e) => {
                      console.log('Back design snapshot image loaded successfully');
                      // Ensure aspect ratio is maintained
                      const img = e.target;
                      if (img.naturalWidth && img.naturalHeight) {
                        const aspectRatio = img.naturalWidth / img.naturalHeight;
                        img.style.width = 'auto';
                        img.style.height = 'auto';
                        img.style.maxWidth = '100%';
                        img.style.maxHeight = '500px';
                      }
                    }}
                  />
                </div>
              ) : null}
              {!designSnapshots.front && !designSnapshots.back && !designSnapshots.top && (
                <div className="approval-design-placeholder">
                  <p>Design snapshots are empty</p>
                  <p className="text-small">Please try submitting for approval again</p>
                </div>
              )}
            </div>
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
                  
                  {productData?.product_number && (
                    <div className="approval-detail-item">
                      <span className="approval-detail-label">Product Number:</span>
                      <span className="approval-detail-value">
                        {productData.product_number}
                      </span>
                    </div>
                  )}
                  
                  {productData?.dimensions_for_display && (
                  <div className="approval-detail-item">
                      <span className="approval-detail-label">Product Dimensions:</span>
                      <span 
                        className="approval-detail-value"
                        dangerouslySetInnerHTML={{ 
                          __html: productData.dimensions_for_display 
                        }}
                      />
                    </div>
                  )}

                  </div>
                
                <div>                  
                  
                  <div className="approval-detail-item">
                    <span className="approval-detail-label">Material:</span>
                    <span className="approval-detail-value">
                      {material?.name || 'Not specified'}
                    </span>
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
                    {isPdfMode ? (
                      <div className="approval-readonly-text">
                        <div>{customer.name || ''}</div>
                        <div>{customer.phone || ''}</div>
                        <div>{customer.email || ''}</div>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                </div>

      
                <div className="approval-detail-item">
                  <span className="approval-detail-label">Address:</span>
                  {isPdfMode ? (
                    <div className="approval-readonly-text">
                      <div>{customer.address_line1 || ''}</div>
                      <div>
                        {[customer.city, customer.state, customer.zip_code]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    </div>
                  ) : (
                    <>
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
                        className="approval-input"
                        placeholder="City"
                      />
                      <div className="approval-input-row">
                        <input
                          type="text"
                          value={customer.state}
                          onChange={(e) => setCustomer({ ...customer, state: e.target.value })}
                          className="approval-input"
                          placeholder="State"
                        />
                        <input
                          type="text"
                          value={customer.zip_code}
                          onChange={(e) => setCustomer({ ...customer, zip_code: e.target.value })}
                          className="approval-input"
                          placeholder="Zip"
                        />
                      </div>
                    </>
                  )}
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
                  {isPdfMode ? (
                    <div className="approval-readonly-text">{signerName}</div>
                  ) : (
                    <input
                      type="text"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      className="approval-field-input"
                      placeholder="Signer Name"
                    />
                  )}
                </div>

                <div className="approval-signature-field">
                  <label className="approval-field-label">Date:</label>
                  {isPdfMode ? (
                    <div className="approval-readonly-text">{signDate}</div>
                  ) : (
                    <input
                      type="date"
                      value={signDate}
                      onChange={(e) => setSignDate(e.target.value)}
                      className="approval-field-input"
                    />
                  )}
                </div>

              </div>

              
              <div className="approval-signature-field">
                <label className="approval-field-label">Signature:</label>
                {isPdfMode && signature ? (
                  <div className="approval-signature-display">
                    <img 
                      src={signature} 
                      alt="Signature" 
                      style={{ maxWidth: '600px', maxHeight: '120px', border: '1px solid #ddd' }}
                    />
                  </div>
                ) : !isPdfMode ? (
                  <SignaturePad
                    onSignatureChange={handleSignatureChange}
                    width={600}
                    height={120}
                    backgroundColor="#FFFFFF"
                    penColor="#000000"
                    penWidth={2}
                  />
                ) : null}
              </div>
            </div>

            {!isPdfMode && (
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
            )}
            <div className="approval-disclaimer">
              <p>By submitting approval, you acknowledge that you are responsible for any errors found after approval. Please check all text and graphics carefully for any errors (i.e., spelling, colors, layout, size, etc.). 
                No further changes can be made once approval is provided. Colors seen on screen may vary slightly from final production colors due to differences in screen color modes. Small dimensional changes may occur in production to allow for proper sand blasting.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalProofView;


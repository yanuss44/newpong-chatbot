export function generateEmailTemplate(formData) {
  // Generates HTML structure to be saved or copied.
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; }
          .container { border: 1px solid #e2e8f0; padding: 25px; border-radius: 8px; max-width: 600px; margin: 0 auto; background: #fff;}
          .header { background-color: #2563eb; color: white; padding: 15px 20px; border-radius: 6px 6px 0 0; text-align: center; }
          .field { margin: 15px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
          .label { font-weight: bold; color: #64748b; font-size: 13px; text-transform: uppercase; margin-bottom: 4px; }
          .value { font-size: 15px; color: #0f172a; }
          .footer { text-align: center; margin-top: 30px; }
          .btn { display: inline-block; padding: 12px 24px; background-color: #ef4444; color: white !important; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.4); }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin:0; font-size: 20px;">Official CS Complaint Form</h2>
            <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.9;">ISO 13485 Tracing Document</p>
          </div>
          
          <div class="field"><div class="label">Reporter Name</div><div class="value">${formData.reporterName || '-'}</div></div>
          <div class="field"><div class="label">Contact Info</div><div class="value">${formData.contactInfo || '-'}</div></div>
          <div class="field"><div class="label">Device Model</div><div class="value">${formData.deviceModel || '-'}</div></div>
          <div class="field"><div class="label">Serial Number (SN)</div><div class="value">${formData.serialNumber || '-'}</div></div>
          <div class="field"><div class="label">Issue Date</div><div class="value">${formData.issueDate || '-'}</div></div>
          
          <div class="field" style="border-bottom: none;">
            <div class="label">Issue Description</div>
            <div class="value" style="background: #f8fafc; padding: 15px; border-radius: 6px; margin-top: 10px;">
              ${(formData.issueDescription || '-').replace(/\n/g, '<br/>')}
            </div>
          </div>
          
          <div class="footer">
            <p style="color: #64748b; font-size: 14px;">본 메일은 자동 생성된 규격 양식입니다. 문제 해결을 위해 아래 버튼을 클릭하여 회신해 주십시오.</p>
            <a href="mailto:support@medicalco.com?subject=Contact%20about%20${formData.deviceModel}" class="btn">담당자에게 직접 문의하기</a>
          </div>
        </div>
      </body>
    </html>
  `;
}

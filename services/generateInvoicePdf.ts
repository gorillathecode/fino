import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Invoice } from '../data/mockData';

export async function exportInvoicePdf(invoice: Invoice, userEmail: string): Promise<void> {
  const statusLabel =
    invoice.status === 'paid' ? 'Bezahlt' :
    invoice.status === 'due' ? 'Offen' : 'Ueberfaellig';

  const statusClass = `status-${invoice.status}`;

  const amountFormatted = invoice.amount.toLocaleString('de-DE') + ' €';

  const dueDateFormatted = (() => {
    const d = new Date(invoice.dueDate);
    if (isNaN(d.getTime())) return invoice.dueDate;
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  })();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #101B3D; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .logo { font-size: 28px; font-weight: bold; color: #0B1736; }
        .logo span { color: #10BFE8; }
        .invoice-title { font-size: 22px; font-weight: bold; margin-bottom: 8px; }
        .invoice-number { color: #667085; font-size: 14px; }
        .section { margin-bottom: 32px; }
        .label { font-size: 12px; color: #667085; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        .value { font-size: 16px; font-weight: 500; }
        .divider { border: none; border-top: 1px solid #E4EAF2; margin: 24px 0; }
        .meta-row { display: flex; justify-content: space-between; }
        .amount-row { display: flex; justify-content: space-between; align-items: center; background: #F7FAFC; padding: 20px; border-radius: 12px; }
        .amount-label { font-size: 16px; color: #667085; }
        .amount-value { font-size: 28px; font-weight: bold; color: #0B1736; }
        .status { display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 500; }
        .status-paid { background: #E1F5EE; color: #0F6E56; }
        .status-due { background: #FFF8EC; color: #854F0B; }
        .status-overdue { background: #FCEBEB; color: #A32D2D; }
        .footer { margin-top: 60px; color: #667085; font-size: 12px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">fino<span>.</span></div>
        <div>
          <div class="invoice-title">Rechnung</div>
          <div class="invoice-number">${invoice.invoiceNumber}</div>
        </div>
      </div>

      <hr class="divider">

      <div class="meta-row">
        <div class="section">
          <div class="label">Von</div>
          <div class="value">${userEmail}</div>
        </div>
        <div class="section">
          <div class="label">An</div>
          <div class="value">${invoice.customerName}</div>
        </div>
        <div class="section">
          <div class="label">Faelligkeitsdatum</div>
          <div class="value">${dueDateFormatted}</div>
        </div>
        <div class="section">
          <div class="label">Status</div>
          <span class="status ${statusClass}">${statusLabel}</span>
        </div>
      </div>

      <hr class="divider">

      <div class="amount-row">
        <div class="amount-label">Gesamtbetrag</div>
        <div class="amount-value">${amountFormatted}</div>
      </div>

      <div class="footer">
        Erstellt mit FINO &middot; Finanz-Copilot fuer Freelancer &middot; fino.app
      </div>
    </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Rechnung ${invoice.invoiceNumber}`,
    UTI: 'com.adobe.pdf',
  });
}

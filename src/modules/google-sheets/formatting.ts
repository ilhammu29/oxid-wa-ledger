import { GoogleSheetsClientConfig, getGoogleAccessToken, ManagedSheetName, MANAGED_SHEET_NAMES, SheetMetadataItem, getSpreadsheetMetadata, handleHttpError } from "./client";
import { SheetMatrix } from "./formatters";

/**
 * Tab colors for each managed worksheet (RGB 0.0 - 1.0).
 */
export const TAB_COLORS: Record<ManagedSheetName, { red: number; green: number; blue: number }> = {
  Dashboard: { red: 0.145, green: 0.388, blue: 0.922 }, // Royal Blue (#2563EB)
  Transactions: { red: 0.02, green: 0.588, blue: 0.412 }, // Emerald Green (#059669)
  Products: { red: 0.486, green: 0.227, blue: 0.929 }, // Vibrant Purple (#7C3AED)
  Daily_Status: { red: 0.851, green: 0.467, blue: 0.024 }, // Warm Amber (#D97706)
  Config: { red: 0.294, green: 0.333, blue: 0.388 }, // Cool Slate (#4B5563)
};

/**
 * Clean canonical sheet order (0-4).
 */
export const MANAGED_SHEET_ORDER: ManagedSheetName[] = [
  "Dashboard",
  "Transactions",
  "Products",
  "Daily_Status",
  "Config",
];

const TRANSACTIONS_COLUMN_WIDTHS = [
  125, // 0: ID Transaksi
  105, // 1: Tanggal
  90,  // 2: Waktu
  160, // 3: Produk
  75,  // 4: Qty
  75,  // 5: Satuan
  125, // 6: Harga Satuan
  135, // 7: Total
  95,  // 8: Kanal
  115, // 9: Status
  320, // 10: Pesan Asal / Referensi
];

const PRODUCTS_COLUMN_WIDTHS = [
  180, // 0: Nama Produk
  85,  // 1: Satuan
  135, // 2: Harga Satuan (IDR)
  110, // 3: Status Aktif
  115, // 4: Produk Default
  280, // 5: Alias Produk
];

const DAILY_STATUS_COLUMN_WIDTHS = [
  110, // 0: Tanggal
  110, // 1: Status
  95,  // 2: Kanal
  320, // 3: Catatan
];

const DASHBOARD_COLUMN_WIDTHS = [
  240, // 0: Label / Tanggal
  180, // 1: Nilai / Omzet
  160, // 2: Periode / Transaksi
  130, // 3: Status
  170, // 4: Keterangan
];

const CONFIG_COLUMN_WIDTHS = [
  200, // 0: Parameter
  420, // 1: Nilai
];

function setColumnWidthRequest(sheetId: number, colIndex: number, pixelSize: number) {
  return {
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "COLUMNS",
        startIndex: colIndex,
        endIndex: colIndex + 1,
      },
      properties: { pixelSize },
      fields: "pixelSize",
    },
  };
}

/**
 * Builds all batchUpdate formatting requests for the 5 managed sheets.
 * Completely idempotent: clears old bandings, filters, conditional formatting, and chart objects before applying.
 */
export function buildManagedSheetsFormattingRequests(
  metadata: { title: string; sheets: SheetMetadataItem[] },
  sheetsData: Partial<Record<ManagedSheetName, SheetMatrix>>
): Record<string, unknown>[] {
  const requests: Record<string, unknown>[] = [];
  const sheetMap = new Map<string, SheetMetadataItem>();
  for (const s of metadata.sheets) {
    sheetMap.set(s.title, s);
  }

  // 0. SPREADSHEET LOCALE: Set Indonesian locale (id_ID) for thousands separator (.) and standard date parsing
  requests.push({
    updateSpreadsheetProperties: {
      properties: {
        locale: "id_ID",
      },
      fields: "locale",
    },
  });

  // 1. IDEMPOTENT CLEANUP: Clear existing basicFilter, bandings, charts, conditional formats on managed sheets
  for (const managedName of MANAGED_SHEET_NAMES) {
    const sheet = sheetMap.get(managedName);
    if (!sheet) continue;

    if (sheet.basicFilter) {
      requests.push({
        clearBasicFilter: {
          sheetId: sheet.id,
        },
      });
    }

    if (sheet.bandedRanges && sheet.bandedRanges.length > 0) {
      for (const b of sheet.bandedRanges) {
        requests.push({
          deleteBanding: {
            bandedRangeId: b.bandedRangeId,
          },
        });
      }
    }

    if (sheet.charts && sheet.charts.length > 0) {
      for (const c of sheet.charts) {
        requests.push({
          deleteEmbeddedObject: {
            objectId: c.chartId,
          },
        });
      }
    }

    if (sheet.conditionalFormats && sheet.conditionalFormats.length > 0) {
      // Must delete backwards from largest index to 0
      for (let i = sheet.conditionalFormats.length - 1; i >= 0; i--) {
        requests.push({
          deleteConditionalFormatRule: {
            sheetId: sheet.id,
            index: i,
          },
        });
      }
    }
  }

  // 2. SHEET PROPERTIES: Tab Ordering, Tab Colors, and Frozen Rows
  MANAGED_SHEET_ORDER.forEach((managedName, targetIndex) => {
    const sheet = sheetMap.get(managedName);
    if (!sheet) return;

    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: sheet.id,
          index: targetIndex,
          tabColor: TAB_COLORS[managedName],
          gridProperties: {
            frozenRowCount: 4,
          },
        },
        fields: "index,tabColor,gridProperties.frozenRowCount",
      },
    });
  });

  // 3. COLUMN WIDTHS
  for (const managedName of MANAGED_SHEET_NAMES) {
    const sheet = sheetMap.get(managedName);
    if (!sheet) continue;

    let widths: number[] = [];
    if (managedName === "Transactions") widths = TRANSACTIONS_COLUMN_WIDTHS;
    else if (managedName === "Products") widths = PRODUCTS_COLUMN_WIDTHS;
    else if (managedName === "Daily_Status") widths = DAILY_STATUS_COLUMN_WIDTHS;
    else if (managedName === "Dashboard") widths = DASHBOARD_COLUMN_WIDTHS;
    else if (managedName === "Config") widths = CONFIG_COLUMN_WIDTHS;

    widths.forEach((w, colIdx) => {
      requests.push(setColumnWidthRequest(sheet.id, colIdx, w));
    });
  }

  // 4. BANNER ROWS STYLING (Rows 1 & 2 / index 0-2)
  for (const managedName of MANAGED_SHEET_NAMES) {
    const sheet = sheetMap.get(managedName);
    if (!sheet) continue;

    requests.push({
      repeatCell: {
        range: {
          sheetId: sheet.id,
          startRowIndex: 0,
          endRowIndex: 2,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.97, green: 0.98, blue: 0.99 },
            textFormat: {
              fontSize: 9,
              italic: true,
              foregroundColor: { red: 0.39, green: 0.45, blue: 0.55 },
            },
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,verticalAlignment)",
      },
    });
  }

  // 5. TABLE HEADER ROWS STYLING (Row 4 / index 3-4)
  for (const managedName of ["Transactions", "Products", "Daily_Status", "Config"] as ManagedSheetName[]) {
    const sheet = sheetMap.get(managedName);
    if (!sheet) continue;

    requests.push({
      repeatCell: {
        range: {
          sheetId: sheet.id,
          startRowIndex: 3,
          endRowIndex: 4,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.09, green: 0.13, blue: 0.19 }, // Dark Slate (#0F172A)
            textFormat: {
              bold: true,
              fontSize: 10,
              foregroundColor: { red: 1, green: 1, blue: 1 },
            },
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,verticalAlignment,wrapStrategy)",
      },
    });
  }

  // 6. SPECIFIC SHEET FORMATTING: TRANSACTIONS
  const txSheet = sheetMap.get("Transactions");
  const txData = sheetsData.Transactions;
  if (txSheet && txData) {
    const dataEndRow = Math.max(5, txData.length);

    // Tanggal (col 1): Date dd/mm/yyyy
    requests.push({
      repeatCell: {
        range: { sheetId: txSheet.id, startRowIndex: 4, endRowIndex: dataEndRow, startColumnIndex: 1, endColumnIndex: 2 },
        cell: { userEnteredFormat: { horizontalAlignment: "CENTER", numberFormat: { type: "DATE", pattern: "dd/mm/yyyy" } } },
        fields: "userEnteredFormat(horizontalAlignment,numberFormat)",
      },
    });

    // Waktu (col 2): Time hh:mm:ss
    requests.push({
      repeatCell: {
        range: { sheetId: txSheet.id, startRowIndex: 4, endRowIndex: dataEndRow, startColumnIndex: 2, endColumnIndex: 3 },
        cell: { userEnteredFormat: { horizontalAlignment: "CENTER", numberFormat: { type: "TIME", pattern: "hh:mm:ss" } } },
        fields: "userEnteredFormat(horizontalAlignment,numberFormat)",
      },
    });

    // Qty (col 4): Number #,##0.##
    requests.push({
      repeatCell: {
        range: { sheetId: txSheet.id, startRowIndex: 4, endRowIndex: dataEndRow, startColumnIndex: 4, endColumnIndex: 5 },
        cell: { userEnteredFormat: { horizontalAlignment: "RIGHT", numberFormat: { type: "NUMBER", pattern: "#,##0.##" } } },
        fields: "userEnteredFormat(horizontalAlignment,numberFormat)",
      },
    });

    // Satuan (col 5): Center
    requests.push({
      repeatCell: {
        range: { sheetId: txSheet.id, startRowIndex: 4, endRowIndex: dataEndRow, startColumnIndex: 5, endColumnIndex: 6 },
        cell: { userEnteredFormat: { horizontalAlignment: "CENTER" } },
        fields: "userEnteredFormat(horizontalAlignment)",
      },
    });

    // Harga Satuan (col 6): Currency IDR
    requests.push({
      repeatCell: {
        range: { sheetId: txSheet.id, startRowIndex: 4, endRowIndex: dataEndRow, startColumnIndex: 6, endColumnIndex: 7 },
        cell: { userEnteredFormat: { horizontalAlignment: "RIGHT", numberFormat: { type: "CURRENCY", pattern: "\"Rp\"#,##0" } } },
        fields: "userEnteredFormat(horizontalAlignment,numberFormat)",
      },
    });

    // Total Amount (col 7): Currency IDR (Bold)
    requests.push({
      repeatCell: {
        range: { sheetId: txSheet.id, startRowIndex: 4, endRowIndex: dataEndRow, startColumnIndex: 7, endColumnIndex: 8 },
        cell: { userEnteredFormat: { horizontalAlignment: "RIGHT", textFormat: { bold: true }, numberFormat: { type: "CURRENCY", pattern: "\"Rp\"#,##0" } } },
        fields: "userEnteredFormat(horizontalAlignment,textFormat,numberFormat)",
      },
    });

    // Kanal (col 8): Center
    requests.push({
      repeatCell: {
        range: { sheetId: txSheet.id, startRowIndex: 4, endRowIndex: dataEndRow, startColumnIndex: 8, endColumnIndex: 9 },
        cell: { userEnteredFormat: { horizontalAlignment: "CENTER" } },
        fields: "userEnteredFormat(horizontalAlignment)",
      },
    });

    // Status (col 9): Center, Bold
    requests.push({
      repeatCell: {
        range: { sheetId: txSheet.id, startRowIndex: 4, endRowIndex: dataEndRow, startColumnIndex: 9, endColumnIndex: 10 },
        cell: { userEnteredFormat: { horizontalAlignment: "CENTER", textFormat: { bold: true } } },
        fields: "userEnteredFormat(horizontalAlignment,textFormat)",
      },
    });

    // Pesan Asal (col 10): Wrap text
    requests.push({
      repeatCell: {
        range: { sheetId: txSheet.id, startRowIndex: 4, endRowIndex: dataEndRow, startColumnIndex: 10, endColumnIndex: 11 },
        cell: { userEnteredFormat: { wrapStrategy: "WRAP", textFormat: { foregroundColor: { red: 0.35, green: 0.40, blue: 0.48 } } } },
        fields: "userEnteredFormat(wrapStrategy,textFormat)",
      },
    });

    // Alternating Banding
    requests.push({
      addBanding: {
        bandedRange: {
          range: {
            sheetId: txSheet.id,
            startRowIndex: 3,
            endRowIndex: Math.max(4, txData.length),
            startColumnIndex: 0,
            endColumnIndex: 11,
          },
          rowProperties: {
            headerColor: { red: 0.09, green: 0.13, blue: 0.19 },
            firstBandColor: { red: 1, green: 1, blue: 1 },
            secondBandColor: { red: 0.97, green: 0.98, blue: 0.99 },
          },
        },
      },
    });

    // Auto-Filter
    requests.push({
      setBasicFilter: {
        filter: {
          range: {
            sheetId: txSheet.id,
            startRowIndex: 3,
            endRowIndex: Math.max(4, txData.length),
            startColumnIndex: 0,
            endColumnIndex: 11,
          },
        },
      },
    });

    // Status Conditional Formatting
    const statusColRange = {
      sheetId: txSheet.id,
      startRowIndex: 4,
      endRowIndex: dataEndRow,
      startColumnIndex: 9,
      endColumnIndex: 10,
    };

    // CONFIRMED (Soft Green)
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [statusColRange],
          booleanRule: {
            condition: { type: "TEXT_CONTAINS", values: [{ userEnteredValue: "confirmed" }] },
            format: {
              backgroundColor: { red: 0.86, green: 0.98, blue: 0.90 },
              textFormat: { foregroundColor: { red: 0.08, green: 0.39, blue: 0.20 }, bold: true },
            },
          },
        },
        index: 0,
      },
    });

    // CANCELLED (Soft Red)
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [statusColRange],
          booleanRule: {
            condition: { type: "TEXT_CONTAINS", values: [{ userEnteredValue: "cancelled" }] },
            format: {
              backgroundColor: { red: 0.99, green: 0.88, blue: 0.88 },
              textFormat: { foregroundColor: { red: 0.60, green: 0.10, blue: 0.10 }, bold: true },
            },
          },
        },
        index: 1,
      },
    });

    // CORRECTED (Soft Amber)
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [statusColRange],
          booleanRule: {
            condition: { type: "TEXT_CONTAINS", values: [{ userEnteredValue: "corrected" }] },
            format: {
              backgroundColor: { red: 0.99, green: 0.95, blue: 0.78 },
              textFormat: { foregroundColor: { red: 0.57, green: 0.25, blue: 0.05 }, bold: true },
            },
          },
        },
        index: 2,
      },
    });
  }

  // 7. SPECIFIC SHEET FORMATTING: PRODUCTS
  const prodSheet = sheetMap.get("Products");
  const prodData = sheetsData.Products;
  if (prodSheet && prodData) {
    const dataEndRow = Math.max(5, prodData.length);

    // Satuan (col 1): Center
    requests.push({
      repeatCell: {
        range: { sheetId: prodSheet.id, startRowIndex: 4, endRowIndex: dataEndRow, startColumnIndex: 1, endColumnIndex: 2 },
        cell: { userEnteredFormat: { horizontalAlignment: "CENTER" } },
        fields: "userEnteredFormat(horizontalAlignment)",
      },
    });

    // Harga Satuan (col 2): Currency IDR
    requests.push({
      repeatCell: {
        range: { sheetId: prodSheet.id, startRowIndex: 4, endRowIndex: dataEndRow, startColumnIndex: 2, endColumnIndex: 3 },
        cell: { userEnteredFormat: { horizontalAlignment: "RIGHT", textFormat: { bold: true }, numberFormat: { type: "CURRENCY", pattern: "\"Rp\"#,##0" } } },
        fields: "userEnteredFormat(horizontalAlignment,textFormat,numberFormat)",
      },
    });

    // Status Aktif (col 3): Center, Bold
    requests.push({
      repeatCell: {
        range: { sheetId: prodSheet.id, startRowIndex: 4, endRowIndex: dataEndRow, startColumnIndex: 3, endColumnIndex: 4 },
        cell: { userEnteredFormat: { horizontalAlignment: "CENTER", textFormat: { bold: true } } },
        fields: "userEnteredFormat(horizontalAlignment,textFormat)",
      },
    });

    // Produk Default (col 4): Center
    requests.push({
      repeatCell: {
        range: { sheetId: prodSheet.id, startRowIndex: 4, endRowIndex: dataEndRow, startColumnIndex: 4, endColumnIndex: 5 },
        cell: { userEnteredFormat: { horizontalAlignment: "CENTER" } },
        fields: "userEnteredFormat(horizontalAlignment)",
      },
    });

    // Alias Produk (col 5): Wrap text
    requests.push({
      repeatCell: {
        range: { sheetId: prodSheet.id, startRowIndex: 4, endRowIndex: dataEndRow, startColumnIndex: 5, endColumnIndex: 6 },
        cell: { userEnteredFormat: { wrapStrategy: "WRAP" } },
        fields: "userEnteredFormat(wrapStrategy)",
      },
    });

    // Banding
    requests.push({
      addBanding: {
        bandedRange: {
          range: {
            sheetId: prodSheet.id,
            startRowIndex: 3,
            endRowIndex: Math.max(4, prodData.length),
            startColumnIndex: 0,
            endColumnIndex: 6,
          },
          rowProperties: {
            headerColor: { red: 0.09, green: 0.13, blue: 0.19 },
            firstBandColor: { red: 1, green: 1, blue: 1 },
            secondBandColor: { red: 0.97, green: 0.98, blue: 0.99 },
          },
        },
      },
    });

    // Filter
    requests.push({
      setBasicFilter: {
        filter: {
          range: {
            sheetId: prodSheet.id,
            startRowIndex: 3,
            endRowIndex: Math.max(4, prodData.length),
            startColumnIndex: 0,
            endColumnIndex: 6,
          },
        },
      },
    });

    // Conditional Formatting on Status Aktif (col 3)
    const activeColRange = {
      sheetId: prodSheet.id,
      startRowIndex: 4,
      endRowIndex: dataEndRow,
      startColumnIndex: 3,
      endColumnIndex: 4,
    };

    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [activeColRange],
          booleanRule: {
            condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "AKTIF" }] },
            format: {
              backgroundColor: { red: 0.86, green: 0.98, blue: 0.90 },
              textFormat: { foregroundColor: { red: 0.08, green: 0.39, blue: 0.20 }, bold: true },
            },
          },
        },
        index: 0,
      },
    });

    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [activeColRange],
          booleanRule: {
            condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "NONAKTIF" }] },
            format: {
              backgroundColor: { red: 0.95, green: 0.95, blue: 0.96 },
              textFormat: { foregroundColor: { red: 0.40, green: 0.40, blue: 0.45 } },
            },
          },
        },
        index: 1,
      },
    });
  }

  // 8. SPECIFIC SHEET FORMATTING: DAILY_STATUS
  const dailySheet = sheetMap.get("Daily_Status");
  const dailyData = sheetsData.Daily_Status;
  if (dailySheet && dailyData) {
    const dataEndRow = Math.max(5, dailyData.length);

    // Tanggal (col 0): Date dd/mm/yyyy
    requests.push({
      repeatCell: {
        range: { sheetId: dailySheet.id, startRowIndex: 4, endRowIndex: dataEndRow, startColumnIndex: 0, endColumnIndex: 1 },
        cell: { userEnteredFormat: { horizontalAlignment: "CENTER", numberFormat: { type: "DATE", pattern: "dd/mm/yyyy" } } },
        fields: "userEnteredFormat(horizontalAlignment,numberFormat)",
      },
    });

    // Status (col 1): Center, Bold
    requests.push({
      repeatCell: {
        range: { sheetId: dailySheet.id, startRowIndex: 4, endRowIndex: dataEndRow, startColumnIndex: 1, endColumnIndex: 2 },
        cell: { userEnteredFormat: { horizontalAlignment: "CENTER", textFormat: { bold: true } } },
        fields: "userEnteredFormat(horizontalAlignment,textFormat)",
      },
    });

    // Kanal (col 2): Center
    requests.push({
      repeatCell: {
        range: { sheetId: dailySheet.id, startRowIndex: 4, endRowIndex: dataEndRow, startColumnIndex: 2, endColumnIndex: 3 },
        cell: { userEnteredFormat: { horizontalAlignment: "CENTER" } },
        fields: "userEnteredFormat(horizontalAlignment)",
      },
    });

    // Catatan (col 3): Wrap text
    requests.push({
      repeatCell: {
        range: { sheetId: dailySheet.id, startRowIndex: 4, endRowIndex: dataEndRow, startColumnIndex: 3, endColumnIndex: 4 },
        cell: { userEnteredFormat: { wrapStrategy: "WRAP" } },
        fields: "userEnteredFormat(wrapStrategy)",
      },
    });

    // Banding
    requests.push({
      addBanding: {
        bandedRange: {
          range: {
            sheetId: dailySheet.id,
            startRowIndex: 3,
            endRowIndex: Math.max(4, dailyData.length),
            startColumnIndex: 0,
            endColumnIndex: 4,
          },
          rowProperties: {
            headerColor: { red: 0.09, green: 0.13, blue: 0.19 },
            firstBandColor: { red: 1, green: 1, blue: 1 },
            secondBandColor: { red: 0.97, green: 0.98, blue: 0.99 },
          },
        },
      },
    });

    // Filter
    requests.push({
      setBasicFilter: {
        filter: {
          range: {
            sheetId: dailySheet.id,
            startRowIndex: 3,
            endRowIndex: Math.max(4, dailyData.length),
            startColumnIndex: 0,
            endColumnIndex: 4,
          },
        },
      },
    });

    // Conditional Formatting on Status (col 1)
    const dailyStatusRange = {
      sheetId: dailySheet.id,
      startRowIndex: 4,
      endRowIndex: dataEndRow,
      startColumnIndex: 1,
      endColumnIndex: 2,
    };

    // OPEN (Soft Green)
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [dailyStatusRange],
          booleanRule: {
            condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "OPEN" }] },
            format: {
              backgroundColor: { red: 0.86, green: 0.98, blue: 0.90 },
              textFormat: { foregroundColor: { red: 0.08, green: 0.39, blue: 0.20 }, bold: true },
            },
          },
        },
        index: 0,
      },
    });

    // NO_SALE (Soft Amber)
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [dailyStatusRange],
          booleanRule: {
            condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "NO_SALE" }] },
            format: {
              backgroundColor: { red: 0.99, green: 0.95, blue: 0.78 },
              textFormat: { foregroundColor: { red: 0.57, green: 0.25, blue: 0.05 }, bold: true },
            },
          },
        },
        index: 1,
      },
    });

    // CLOSED (Soft Red/Gray)
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [dailyStatusRange],
          booleanRule: {
            condition: { type: "TEXT_EQ", values: [{ userEnteredValue: "CLOSED" }] },
            format: {
              backgroundColor: { red: 0.99, green: 0.88, blue: 0.88 },
              textFormat: { foregroundColor: { red: 0.60, green: 0.10, blue: 0.10 }, bold: true },
            },
          },
        },
        index: 2,
      },
    });
  }

  // 9. SPECIFIC SHEET FORMATTING: DASHBOARD
  const dashSheet = sheetMap.get("Dashboard");
  const dashData = sheetsData.Dashboard;
  if (dashSheet && dashData) {
    // KPI Table Header (Row 7 / index 6)
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheet.id, startRowIndex: 6, endRowIndex: 7, startColumnIndex: 0, endColumnIndex: 4 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.09, green: 0.13, blue: 0.19 },
            textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 1, green: 1, blue: 1 } },
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,verticalAlignment)",
      },
    });

    // KPI Values: Omzet (rows 7-10, col 1): Currency IDR
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheet.id, startRowIndex: 7, endRowIndex: 10, startColumnIndex: 1, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: "RIGHT",
            textFormat: { bold: true },
            numberFormat: { type: "CURRENCY", pattern: "\"Rp\"#,##0" },
          },
        },
        fields: "userEnteredFormat(horizontalAlignment,textFormat,numberFormat)",
      },
    });

    // KPI Values: Counts (rows 10-12, col 1): Number #,##0
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheet.id, startRowIndex: 10, endRowIndex: 12, startColumnIndex: 1, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: "RIGHT",
            textFormat: { bold: true },
            numberFormat: { type: "NUMBER", pattern: "#,##0" },
          },
        },
        fields: "userEnteredFormat(horizontalAlignment,textFormat,numberFormat)",
      },
    });

    // 14-Day Series Header (Row 14 / index 13)
    requests.push({
      repeatCell: {
        range: { sheetId: dashSheet.id, startRowIndex: 13, endRowIndex: 14, startColumnIndex: 0, endColumnIndex: 3 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.09, green: 0.13, blue: 0.19 },
            textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 1, green: 1, blue: 1 } },
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,verticalAlignment)",
      },
    });

    // 14-Day Series Data Rows (from row index 14 downwards)
    if (dashData.length > 14) {
      const dailyEndRow = dashData.length;

      // Tanggal (col 0): Date dd/mm/yyyy
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheet.id, startRowIndex: 14, endRowIndex: dailyEndRow, startColumnIndex: 0, endColumnIndex: 1 },
          cell: { userEnteredFormat: { horizontalAlignment: "CENTER", numberFormat: { type: "DATE", pattern: "dd/mm/yyyy" } } },
          fields: "userEnteredFormat(horizontalAlignment,numberFormat)",
        },
      });

      // Omzet (col 1): Currency IDR
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheet.id, startRowIndex: 14, endRowIndex: dailyEndRow, startColumnIndex: 1, endColumnIndex: 2 },
          cell: { userEnteredFormat: { horizontalAlignment: "RIGHT", textFormat: { bold: true }, numberFormat: { type: "CURRENCY", pattern: "\"Rp\"#,##0" } } },
          fields: "userEnteredFormat(horizontalAlignment,textFormat,numberFormat)",
        },
      });

      // Transaksi (col 2): Number #,##0
      requests.push({
        repeatCell: {
          range: { sheetId: dashSheet.id, startRowIndex: 14, endRowIndex: dailyEndRow, startColumnIndex: 2, endColumnIndex: 3 },
          cell: { userEnteredFormat: { horizontalAlignment: "RIGHT", numberFormat: { type: "NUMBER", pattern: "#,##0" } } },
          fields: "userEnteredFormat(horizontalAlignment,numberFormat)",
        },
      });

      // Banding on 14-day table
      requests.push({
        addBanding: {
          bandedRange: {
            range: {
              sheetId: dashSheet.id,
              startRowIndex: 13,
              endRowIndex: dailyEndRow,
              startColumnIndex: 0,
              endColumnIndex: 3,
            },
            rowProperties: {
              headerColor: { red: 0.09, green: 0.13, blue: 0.19 },
              firstBandColor: { red: 1, green: 1, blue: 1 },
              secondBandColor: { red: 0.97, green: 0.98, blue: 0.99 },
            },
          },
        },
      });

      // Filter on 14-day table
      requests.push({
        setBasicFilter: {
          filter: {
            range: {
              sheetId: dashSheet.id,
              startRowIndex: 13,
              endRowIndex: dailyEndRow,
              startColumnIndex: 0,
              endColumnIndex: 3,
            },
          },
        },
      });
    }
  }

  // 10. SPECIFIC SHEET FORMATTING: CONFIG
  const confSheet = sheetMap.get("Config");
  const confData = sheetsData.Config;
  if (confSheet && confData) {
    const dataEndRow = Math.max(5, confData.length);

    // Key col (col 0): Bold
    requests.push({
      repeatCell: {
        range: { sheetId: confSheet.id, startRowIndex: 4, endRowIndex: dataEndRow, startColumnIndex: 0, endColumnIndex: 1 },
        cell: { userEnteredFormat: { textFormat: { bold: true, foregroundColor: { red: 0.20, green: 0.25, blue: 0.33 } } } },
        fields: "userEnteredFormat(textFormat)",
      },
    });

    // Value col (col 1): Wrap text
    requests.push({
      repeatCell: {
        range: { sheetId: confSheet.id, startRowIndex: 4, endRowIndex: dataEndRow, startColumnIndex: 1, endColumnIndex: 2 },
        cell: { userEnteredFormat: { wrapStrategy: "WRAP" } },
        fields: "userEnteredFormat(wrapStrategy)",
      },
    });
  }

  return requests;
}

/**
 * Builds optional safe chart request for Dashboard sheet (14-day sales trend).
 * Returns null if not enough data (< 2 data points).
 */
export function buildDashboardChartRequest(
  metadata: { title: string; sheets: SheetMetadataItem[] },
  sheetsData: Partial<Record<ManagedSheetName, SheetMatrix>>
): Record<string, unknown> | null {
  const dashSheet = metadata.sheets.find((s) => s.title === "Dashboard");
  const dashData = sheetsData.Dashboard;
  if (!dashSheet || !dashData) return null;

  // Daily points start after row index 13 (so index 14+)
  const dailyRowCount = dashData.length - 14;
  if (dailyRowCount < 2) return null;

  return {
    addChart: {
      chart: {
        spec: {
          title: "Tren Omzet Penjualan (14 Hari Terakhir)",
          basicChart: {
            chartType: "COLUMN",
            legendPosition: "NONE",
            axis: [
              {
                position: "BOTTOM_AXIS",
                title: "Tanggal",
              },
              {
                position: "LEFT_AXIS",
                title: "Omzet (IDR)",
              },
            ],
            domains: [
              {
                domain: {
                  sourceRange: {
                    sources: [
                      {
                        sheetId: dashSheet.id,
                        startRowIndex: 13,
                        endRowIndex: dashData.length,
                        startColumnIndex: 0,
                        endColumnIndex: 1,
                      },
                    ],
                  },
                },
              },
            ],
            series: [
              {
                series: {
                  sourceRange: {
                    sources: [
                      {
                        sheetId: dashSheet.id,
                        startRowIndex: 13,
                        endRowIndex: dashData.length,
                        startColumnIndex: 1,
                        endColumnIndex: 2,
                      },
                    ],
                  },
                },
                targetAxis: "LEFT_AXIS",
                colorStyle: {
                  rgbColor: { red: 0.05, green: 0.55, blue: 0.40 }, // Emerald #0E9F6E
                },
              },
            ],
            headerCount: 1,
          },
        },
        position: {
          overlayPosition: {
            anchorCell: {
              sheetId: dashSheet.id,
              rowIndex: 3,
              columnIndex: 3,
            },
            widthPixels: 520,
            heightPixels: 260,
          },
        },
      },
    },
  };
}

/**
 * Applies full executive presentation formatting, styling, auto-filters, banding, and safe chart.
 * Operates idempotently and non-destructively; never touches custom client sheets.
 */
export async function applyManagedSheetsFormatting(
  spreadsheetId: string,
  sheetsData: Partial<Record<ManagedSheetName, SheetMatrix>>,
  config?: GoogleSheetsClientConfig
): Promise<void> {
  const token = await getGoogleAccessToken(config);
  const fetcher = config?.fetchFn || fetch;

  // 1. Fetch current spreadsheet structure including existing bandings/filters
  const meta = await getSpreadsheetMetadata(spreadsheetId, config);

  // 2. Build core formatting requests
  const formattingRequests = buildManagedSheetsFormattingRequests(meta, sheetsData);

  if (formattingRequests.length > 0) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}:batchUpdate`;

    const res = await fetcher(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests: formattingRequests }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw handleHttpError(res.status, body);
    }
  }

  // 3. SAFE CHART CREATION: Wrapped in try/catch to fail gracefully without aborting sync
  try {
    const chartReq = buildDashboardChartRequest(meta, sheetsData);
    if (chartReq) {
      const chartUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId
      )}:batchUpdate`;

      const chartRes = await fetcher(chartUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests: [chartReq] }),
      });

      if (!chartRes.ok) {
        const body = await chartRes.text().catch(() => "");
        console.warn("[GoogleSheetsFormatting] Optional chart creation skipped:", body.slice(0, 150));
      }
    }
  } catch (chartErr) {
    console.warn("[GoogleSheetsFormatting] Safe chart creation caught error (non-fatal):", chartErr);
  }
}

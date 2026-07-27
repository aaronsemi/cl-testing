"""Generate a Basketball Club Tryouts & Camps tracking workbook.

Produces `basketball_club_updates.xlsx` with four tabs:
  - README      : how to use and update the sheet (manual + automatic)
  - Club Tryouts: one row per tryout event
  - Club Camps  : one row per camp
  - Lists       : dropdown source values (used by data validation)

The workbook is designed to be uploaded to Google Drive and converted to a
native Google Sheet, but it also works as a standalone Excel file.
"""

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

FONT = "Arial"

# ---- palette -------------------------------------------------------------
HEADER_FILL = PatternFill("solid", fgColor="1F3864")   # dark navy
HEADER_FONT = Font(name=FONT, size=11, bold=True, color="FFFFFF")
TITLE_FONT = Font(name=FONT, size=16, bold=True, color="1F3864")
SUB_FONT = Font(name=FONT, size=10, italic=True, color="555555")
BODY_FONT = Font(name=FONT, size=10, color="000000")
EXAMPLE_FONT = Font(name=FONT, size=10, italic=True, color="808080")
INPUT_FILL = PatternFill("solid", fgColor="FFF2CC")    # light yellow = edit here
BAND_FILL = PatternFill("solid", fgColor="F2F2F2")     # zebra striping
THIN = Side(style="thin", color="BFBFBF")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP_TOP = Alignment(wrap_text=True, vertical="top")

wb = Workbook()

# ==========================================================================
# README tab
# ==========================================================================
ws = wb.active
ws.title = "README"
ws.sheet_view.showGridLines = False
ws.column_dimensions["A"].width = 2
ws.column_dimensions["B"].width = 105

readme = [
    ("title", "🏀 Basketball Club Tryouts & Camps Tracker"),
    ("sub", "A living directory of club tryouts and camps. Update it by hand, or wire it up to refresh automatically."),
    ("blank", ""),
    ("h", "What's in this workbook"),
    ("li", "Club Tryouts  — one row per tryout: club, age/level, dates, location, cost, registration link, status."),
    ("li", "Club Camps    — one row per camp: club, camp name, type, dates, location, cost, ages, link, status."),
    ("li", "Lists         — the dropdown values used by the Status / Level / Camp Type columns. Edit here to change the menus."),
    ("blank", ""),
    ("h", "How to update it MANUALLY"),
    ("li", "1. Open the Club Tryouts or Club Camps tab."),
    ("li", "2. Type into the first empty row. Yellow header cells mark columns you fill in."),
    ("li", "3. Status, Level, and Camp Type are dropdowns — pick a value instead of typing."),
    ("li", "4. Paste the registration URL in the 'Registration Link' column so it's one click away."),
    ("li", "5. Sort or filter with Data ▸ Create a filter (Google Sheets) to group by club, date, or status."),
    ("blank", ""),
    ("h", "How to update it AUTOMATICALLY (options)"),
    ("li", "A) Google Form intake — Create a Google Form ('Add club tryout/camp') and, in the Form editor, link responses"),
    ("li", "     to this Sheet (Responses ▸ Link to Sheets). New submissions append as rows automatically."),
    ("li", "B) Scheduled script — In the Sheet: Extensions ▸ Apps Script. Add a function that fetches a club's public"),
    ("li", "     calendar / page and writes rows, then Triggers ▸ add a time-based trigger (e.g. daily). Sample stub below."),
    ("li", "C) IMPORTHTML / IMPORTXML — For a club page with a clean HTML table you can pull it live into a helper tab:"),
    ("li", "         =IMPORTHTML(\"https://example-club.com/tryouts\", \"table\", 1)"),
    ("li", "     then copy the values you want into Club Tryouts. (Import functions are live but read-only.)"),
    ("blank", ""),
    ("h", "Apps Script starter (Extensions ▸ Apps Script, paste, set a daily trigger)"),
    ("code", "function refreshBasketballUpdates() {"),
    ("code", "  const sheet = SpreadsheetApp.getActive().getSheetByName('Club Tryouts');"),
    ("code", "  // const html = UrlFetchApp.fetch('https://your-club.com/tryouts').getContentText();"),
    ("code", "  // ...parse rows from html..."),
    ("code", "  // sheet.appendRow([club, level, startDate, endDate, city, state, venue, cost, link, 'Open', notes, new Date()]);"),
    ("code", "}"),
    ("blank", ""),
    ("h", "Legend"),
    ("li", "Yellow header  = a column you type into.   Dropdown = pick from the Lists tab.   Row turns easy to scan via striping."),
    ("li", "The first data row on each tab is a grey EXAMPLE — overwrite or delete it."),
    ("blank", ""),
    ("sub", "Created 2026-07-27 · duplicate a tab and rename to track another sport or season."),
]

r = 1
for kind, text in readme:
    c = ws.cell(row=r, column=2, value=text)
    if kind == "title":
        c.font = TITLE_FONT
    elif kind == "sub":
        c.font = SUB_FONT
    elif kind == "h":
        c.font = Font(name=FONT, size=12, bold=True, color="1F3864")
    elif kind == "code":
        c.font = Font(name="Consolas", size=9, color="333333")
    else:
        c.font = BODY_FONT
    r += 1

# ==========================================================================
# helper to build a data tab
# ==========================================================================

def build_tab(name, columns, example_row):
    ws = wb.create_sheet(name)
    ws.sheet_view.showGridLines = False

    # Title
    ws.cell(row=1, column=1, value=name).font = TITLE_FONT
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(columns))

    header_row = 3
    for idx, (label, width) in enumerate(columns, start=1):
        c = ws.cell(row=header_row, column=idx, value=label)
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
        c.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
        c.border = BORDER
        ws.column_dimensions[get_column_letter(idx)].width = width
    ws.row_dimensions[header_row].height = 30

    # example row
    er = header_row + 1
    for idx, val in enumerate(example_row, start=1):
        c = ws.cell(row=er, column=idx, value=val)
        c.font = EXAMPLE_FONT
        c.alignment = WRAP_TOP
        c.border = BORDER

    # empty formatted rows for typing
    for row in range(er + 1, er + 40):
        band = (row - er) % 2 == 1
        for idx in range(1, len(columns) + 1):
            c = ws.cell(row=row, column=idx)
            c.font = BODY_FONT
            c.alignment = WRAP_TOP
            c.border = BORDER
            if band:
                c.fill = BAND_FILL

    ws.freeze_panes = ws.cell(row=header_row + 1, column=1)
    return ws, header_row


# ==========================================================================
# Club Tryouts tab
# ==========================================================================
tryout_cols = [
    ("Club / Program", 24),
    ("Level", 16),
    ("Start Date", 13),
    ("End Date", 13),
    ("City", 16),
    ("State", 8),
    ("Venue / Address", 26),
    ("Cost ($)", 10),
    ("Registration Link", 30),
    ("Status", 14),
    ("Notes", 30),
    ("Last Updated", 14),
]
tryout_example = [
    "Elite Hoops Academy", "U14 Boys", "2026-08-15", "2026-08-16",
    "Austin", "TX", "Sports Center, 123 Main St",
    150, "https://elitehoops.example.com/tryouts", "Open",
    "Bring water + reversible jersey", "2026-07-27",
]
ws_try, try_header = build_tab("Club Tryouts", tryout_cols, tryout_example)

# ==========================================================================
# Club Camps tab
# ==========================================================================
camp_cols = [
    ("Club / Program", 24),
    ("Camp Name", 22),
    ("Camp Type", 16),
    ("Ages / Level", 16),
    ("Start Date", 13),
    ("End Date", 13),
    ("City", 16),
    ("State", 8),
    ("Venue / Address", 26),
    ("Cost ($)", 10),
    ("Registration Link", 30),
    ("Status", 14),
    ("Notes", 26),
    ("Last Updated", 14),
]
camp_example = [
    "Elite Hoops Academy", "Summer Skills Camp", "Day Camp", "Ages 8-14",
    "2026-07-06", "2026-07-10", "Austin", "TX", "Sports Center, 123 Main St",
    275, "https://elitehoops.example.com/camps", "Open",
    "Lunch included; half-day option", "2026-07-27",
]
ws_camp, camp_header = build_tab("Club Camps", camp_cols, camp_example)

# ==========================================================================
# Lists tab (dropdown sources)
# ==========================================================================
wl = wb.create_sheet("Lists")
wl.sheet_view.showGridLines = False
lists = {
    "A": ("Status", ["Open", "Closing Soon", "Waitlist", "Full", "Closed", "TBD"]),
    "B": ("Level", ["U8", "U10", "U12", "U14", "U16", "U18",
                    "U12 Boys", "U12 Girls", "U14 Boys", "U14 Girls",
                    "U16 Boys", "U16 Girls", "Varsity", "All Ages"]),
    "C": ("Camp Type", ["Day Camp", "Overnight Camp", "Skills Camp",
                         "Shooting Camp", "Elite / Exposure", "Team Camp", "Clinic"]),
}
for col, (title, vals) in lists.items():
    wl.cell(row=1, column=ord(col) - 64, value=title).font = HEADER_FONT
    wl.cell(row=1, column=ord(col) - 64).fill = HEADER_FILL
    wl.column_dimensions[col].width = 18
    for i, v in enumerate(vals, start=2):
        wl.cell(row=i, column=ord(col) - 64, value=v).font = BODY_FONT

# ---- data validation dropdowns ------------------------------------------

def add_dropdown(ws, header_row, col_idx, source_range):
    col = get_column_letter(col_idx)
    dv = DataValidation(type="list", formula1=source_range, allow_blank=True)
    dv.add(f"{col}{header_row + 1}:{col}{header_row + 60}")
    ws.add_data_validation(dv)

# Tryouts: Level (col 2) -> Lists!B, Status (col 10) -> Lists!A
add_dropdown(ws_try, try_header, 2, "=Lists!$B$2:$B$15")
add_dropdown(ws_try, try_header, 10, "=Lists!$A$2:$A$7")
# Camps: Camp Type (col 3) -> Lists!C, Status (col 12) -> Lists!A
add_dropdown(ws_camp, camp_header, 3, "=Lists!$C$2:$C$8")
add_dropdown(ws_camp, camp_header, 12, "=Lists!$A$2:$A$7")

wb.save("basketball_club_updates.xlsx")
print("Wrote basketball_club_updates.xlsx")

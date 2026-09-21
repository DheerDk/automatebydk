import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def create_guide():
    doc = docx.Document()

    # Page Margins
    sections = doc.sections
    for s in sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)

    # Styles
    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Segoe UI'
    style_normal.font.size = Pt(10.5)
    style_normal.font.color.rgb = RGBColor(0x33, 0x33, 0x33)

    # 1. Header & Title Block
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_brand = p_title.add_run("AutoMate by DK\n")
    run_brand.font.name = 'Segoe UI'
    run_brand.font.size = Pt(24)
    run_brand.font.bold = True
    run_brand.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A) # Slate 900

    run_sub = p_title.add_run("Automate conversations. Capture leads. Grow your business.\n")
    run_sub.font.size = Pt(12)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(0x05, 0x96, 0x69) # Emerald 600

    run_doc_title = p_title.add_run("Complete End-to-End Production Deployment Guide")
    run_doc_title.font.size = Pt(16)
    run_doc_title.font.bold = True
    run_doc_title.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # Architecture Overview Callout
    callout_tbl = doc.add_table(rows=1, cols=1)
    callout_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_cell = callout_tbl.cell(0, 0)
    set_cell_background(c_cell, "F0FDF4") # Emerald 50
    set_cell_margins(c_cell, 150, 150, 200, 200)
    p_call = c_cell.paragraphs[0]
    r_arch_title = p_call.add_run("🏗️ Production Architecture Overview:\n")
    r_arch_title.bold = True
    r_arch_title.font.color.rgb = RGBColor(0x06, 0x5F, 0x46)
    p_call.add_run("• Database: Supabase PostgreSQL (Managed Cloud DB with SSL & Pooling)\n")
    p_call.add_run("• Backend API: Render.com Web Service (Node.js + Baileys Multi-Device QR Engine + WebSockets)\n")
    p_call.add_run("• Frontend Web: Cloudflare Pages (High-Speed Edge CDN for Vite + React SPA)\n")
    p_call.add_run("• GitHub Repository: https://github.com/DheerDk/whatsapp-automation")

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # --- STEP 1 ---
    h1 = doc.add_heading("Step 1: Database Setup (Supabase)", level=1)
    h1.style.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    doc.add_paragraph(
        "Supabase hosts your isolated, encrypted multi-tenant PostgreSQL database. "
        "Every tenant's catalog, conversation history, automated rules, leads, and tokens are stored securely here."
    )

    doc.add_paragraph("1. Go to https://supabase.com and create/open your project.")
    doc.add_paragraph("2. Click the Connect button at the top header of the project dashboard (or go to Database -> Connection Pooler).")
    doc.add_paragraph("3. Select ORM -> Prisma (or Direct/Session connection strings).")
    doc.add_paragraph("4. Because your password contains special characters (@ and #), they must be URL-encoded:")
    
    p_enc = doc.add_paragraph()
    r_enc = p_enc.add_run("   • Original Password: Dheer8854@#\n   • Encoded Password: Dheer8854%40%23")
    r_enc.bold = True
    r_enc.font.color.rgb = RGBColor(0xB9, 0x1C, 0x1C)

    doc.add_paragraph("Your exact connection strings for this deployment:")

    # Table of connection strings
    tbl_db = doc.add_table(rows=3, cols=2)
    tbl_db.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    # Headers
    tbl_db.cell(0, 0).paragraphs[0].add_run("Variable Name").bold = True
    tbl_db.cell(0, 1).paragraphs[0].add_run("Exact Connection URI").bold = True
    set_cell_background(tbl_db.cell(0, 0), "E2E8F0")
    set_cell_background(tbl_db.cell(0, 1), "E2E8F0")

    tbl_db.cell(1, 0).paragraphs[0].add_run("DATABASE_URL")
    tbl_db.cell(1, 1).paragraphs[0].add_run(
        "postgresql://postgres.zxekgmbbxsezmzudmqsm:Dheer8854%40%23@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
    )

    tbl_db.cell(2, 0).paragraphs[0].add_run("DIRECT_URL")
    tbl_db.cell(2, 1).paragraphs[0].add_run(
        "postgresql://postgres.zxekgmbbxsezmzudmqsm:Dheer8854%40%23@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
    )

    for row in tbl_db.rows:
        for cell in row.cells:
            set_cell_margins(cell, 80, 80, 100, 100)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # --- STEP 2 ---
    h2 = doc.add_heading("Step 2: Backend API Setup (Render.com)", level=1)
    h2.style.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    doc.add_paragraph("1. Visit https://render.com and sign in with your GitHub account.")
    doc.add_paragraph("2. Click '+ New' at top right and choose 'Web Service'.")
    doc.add_paragraph("3. Select 'Build and deploy from a Git repository' and connect DheerDk/whatsapp-automation.")
    doc.add_paragraph("4. Configure the Web Service with the exact settings below:")

    # Table of Render Settings
    tbl_render = doc.add_table(rows=7, cols=2)
    tbl_render.alignment = WD_TABLE_ALIGNMENT.CENTER

    render_fields = [
        ("Service Name", "automate-by-dk-api"),
        ("Region", "Singapore (or closest to your DB)"),
        ("Branch", "main"),
        ("Runtime", "Node"),
        ("Build Command", "npm run build:shared && npm run build:api && npm run db:push"),
        ("Start Command", "npm run start --workspace=@chatflow/api"),
    ]

    tbl_render.cell(0, 0).paragraphs[0].add_run("Render Setting").bold = True
    tbl_render.cell(0, 1).paragraphs[0].add_run("Value").bold = True
    set_cell_background(tbl_render.cell(0, 0), "E2E8F0")
    set_cell_background(tbl_render.cell(0, 1), "E2E8F0")

    for i, (k, v) in enumerate(render_fields, start=1):
        tbl_render.cell(i, 0).paragraphs[0].add_run(k).bold = True
        tbl_render.cell(i, 1).paragraphs[0].add_run(v)
        set_cell_margins(tbl_render.cell(i, 0), 60, 60, 100, 100)
        set_cell_margins(tbl_render.cell(i, 1), 60, 60, 100, 100)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)
    doc.add_paragraph("5. Add the Environment Variables into Render:")

    # Table of Environment Variables
    tbl_env = doc.add_table(rows=9, cols=2)
    tbl_env.alignment = WD_TABLE_ALIGNMENT.CENTER

    env_vars = [
        ("DATABASE_URL", "postgresql://postgres.zxekgmbbxsezmzudmqsm:Dheer8854%40%23@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"),
        ("DIRECT_URL", "postgresql://postgres.zxekgmbbxsezmzudmqsm:Dheer8854%40%23@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"),
        ("NODE_ENV", "production"),
        ("PORT", "10000"),
        ("JWT_SECRET", "dk_automate_super_secret_jwt_key_2025_prod!"),
        ("JWT_REFRESH_SECRET", "dk_automate_super_secret_jwt_refresh_2025_prod!"),
        ("MOCK_WHATSAPP", "false"),
        ("MOCK_AI", "true"),
    ]

    tbl_env.cell(0, 0).paragraphs[0].add_run("Key").bold = True
    tbl_env.cell(0, 1).paragraphs[0].add_run("Value").bold = True
    set_cell_background(tbl_env.cell(0, 0), "E2E8F0")
    set_cell_background(tbl_env.cell(0, 1), "E2E8F0")

    for i, (k, v) in enumerate(env_vars, start=1):
        tbl_env.cell(i, 0).paragraphs[0].add_run(k).bold = True
        tbl_env.cell(i, 1).paragraphs[0].add_run(v)
        set_cell_margins(tbl_env.cell(i, 0), 50, 50, 80, 80)
        set_cell_margins(tbl_env.cell(i, 1), 50, 50, 80, 80)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)
    doc.add_paragraph("6. Click 'Create Web Service'. When deployment completes, copy your live Render API URL (e.g. https://automate-by-dk-api.onrender.com).")

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # --- STEP 3 ---
    h3 = doc.add_heading("Step 3: Frontend Website Setup (Cloudflare Pages)", level=1)
    h3.style.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    doc.add_paragraph("1. Visit https://dash.cloudflare.com and go to 'Compute (Workers & Pages)'.")
    doc.add_paragraph("2. Click 'Create application' -> 'Pages' tab -> 'Connect to Git'.")
    doc.add_paragraph("3. Select your repository: DheerDk/whatsapp-automation.")
    doc.add_paragraph("4. Configure the build parameters:")

    tbl_cf = doc.add_table(rows=6, cols=2)
    tbl_cf.alignment = WD_TABLE_ALIGNMENT.CENTER

    cf_settings = [
        ("Project Name", "automate-by-dk"),
        ("Production Branch", "main"),
        ("Framework Preset", "None / Vite"),
        ("Build Command", "npm run build:shared && npm run build:web"),
        ("Build Output Directory", "apps/web/dist"),
    ]

    tbl_cf.cell(0, 0).paragraphs[0].add_run("Cloudflare Field").bold = True
    tbl_cf.cell(0, 1).paragraphs[0].add_run("Value").bold = True
    set_cell_background(tbl_cf.cell(0, 0), "E2E8F0")
    set_cell_background(tbl_cf.cell(0, 1), "E2E8F0")

    for i, (k, v) in enumerate(cf_settings, start=1):
        tbl_cf.cell(i, 0).paragraphs[0].add_run(k).bold = True
        tbl_cf.cell(i, 1).paragraphs[0].add_run(v)
        set_cell_margins(tbl_cf.cell(i, 0), 60, 60, 100, 100)
        set_cell_margins(tbl_cf.cell(i, 1), 60, 60, 100, 100)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)
    doc.add_paragraph("5. Under 'Environment variables (advanced)', add:")
    
    tbl_cf_env = doc.add_table(rows=2, cols=2)
    tbl_cf_env.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_cf_env.cell(0, 0).paragraphs[0].add_run("Variable Name").bold = True
    tbl_cf_env.cell(0, 1).paragraphs[0].add_run("Value").bold = True
    set_cell_background(tbl_cf_env.cell(0, 0), "E2E8F0")
    set_cell_background(tbl_cf_env.cell(0, 1), "E2E8F0")

    tbl_cf_env.cell(1, 0).paragraphs[0].add_run("VITE_API_URL").bold = True
    tbl_cf_env.cell(1, 1).paragraphs[0].add_run("https://automate-by-dk-api.onrender.com (Your Render URL without trailing slash)")
    set_cell_margins(tbl_cf_env.cell(1, 0), 60, 60, 100, 100)
    set_cell_margins(tbl_cf_env.cell(1, 1), 60, 60, 100, 100)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)
    doc.add_paragraph("6. Click 'Save and Deploy'. Cloudflare will publish your live website URL (e.g. https://automate-by-dk.pages.dev).")

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # --- STEP 4 ---
    h4 = doc.add_heading("Step 4: Real-Time Verification & WhatsApp Pairing", level=1)
    h4.style.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    doc.add_paragraph("1. Open your live Cloudflare Pages URL in your browser.")
    doc.add_paragraph("2. Click 'Get Started' / 'Register' to create your store owner account.")
    doc.add_paragraph("3. Inside the Dashboard, navigate to 'Settings' -> 'WhatsApp Integration'.")
    doc.add_paragraph("4. Click 'Scan QR Code (Personal / Business)' -> 'Generate Pairing QR Code'.")
    doc.add_paragraph("5. On your phone: Open WhatsApp -> Menu (3 dots or Settings) -> Linked Devices -> 'Link a Device'.")
    doc.add_paragraph("6. Scan the QR code displayed on screen. Once paired, the status will show 'CONNECTED' with green badge.")
    doc.add_paragraph("7. Send 'Hi' from any other number to test your automated welcome menu and product flows!")

    # Save
    out_path = r"d:\project\whatsapp automation\AutoMate_by_DK_Complete_Deployment_Guide.docx"
    doc.save(out_path)
    print(f"Successfully generated Word document at: {out_path}")

if __name__ == "__main__":
    create_guide()

#!/usr/bin/env python3
"""CyberTrustWorks Client Intake Web UI Server

Serves the graphical intake interface and provides REST endpoints to:
- Load sample client configurations
- Validate intake parameters and licensing limits
- Generate sealed client specifications (client_spec.json)
- Generate turnkey client PostgreSQL database schemas (<customer ID>_init.sql)
- Package deployment bundles with docker-compose.yml and deployment instructions

Usage:
    python3 intake/server.py --port 5050
"""

import argparse
import http.server
import json
import os
import re
import socketserver
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

# Import existing core modules
from intake.client_intake import (
    LicenseSecretError,
    compute_license_signature,
    validate_spec,
)
from db.generate_client_schema import build_client_schema, sql_file_name
from scripts.build_client_bundle import write_deployment_files

CUSTOMER_ID_RE = re.compile(r"^[A-Za-z0-9_-]{3,32}$")
DIST_DIR = os.path.join(ROOT, "dist_client")
EXCEL_PATH = os.path.join(ROOT, "docs/Master-Framework v13.0 Control-Framework Map.xlsx")

FRAMEWORKS_METADATA = [
    {
        "id": 101, "code": "ISO9001", "standard": "ISO 9001:2015",
        "category": "Quality & Operations", "clauses": "10 clauses",
        "desc": "Quality management systems for consistent service delivery and process quality.",
        "icon": "award"
    },
    {
        "id": 102, "code": "ISO27001", "standard": "ISO/IEC 27001:2022",
        "category": "Information Security / IT", "clauses": "10 clauses · 93 controls (Annex A)",
        "desc": "International standard for Information Security Management Systems (ISMS).",
        "icon": "shield-check", "recommended": True
    },
    {
        "id": 103, "code": "DPDPA", "standard": "DPDPA 2023",
        "category": "Data Privacy & Governance", "clauses": "8 sections · 69 provisions",
        "desc": "India Digital Personal Data Protection Act compliance and privacy governance.",
        "icon": "lock", "recommended": True
    },
    {
        "id": 104, "code": "ISO22301", "standard": "ISO 22301:2019",
        "category": "Business Continuity", "clauses": "10 clauses",
        "desc": "Business continuity management system (BCMS) requirements and disaster readiness.",
        "icon": "refresh-cw"
    },
    {
        "id": 105, "code": "ISO31000", "standard": "ISO 31000:2018",
        "category": "Risk Management", "clauses": "Risk Framework & Process",
        "desc": "Enterprise risk management guidelines and operational risk assessments.",
        "icon": "alert-triangle"
    },
    {
        "id": 106, "code": "ISO45001", "standard": "ISO 45001:2018",
        "category": "Occupational Safety", "clauses": "10 clauses",
        "desc": "Occupational health and safety management system (OH&S).",
        "icon": "activity"
    },
    {
        "id": 107, "code": "NIST-SP800-53", "standard": "NIST SP 800-53 Rev. 5",
        "category": "Information Security / FedRAMP", "clauses": "20 control families",
        "desc": "Security and privacy controls catalog for federal systems and organizations.",
        "icon": "server"
    },
    {
        "id": 108, "code": "NIST-CSF2", "standard": "NIST CSF 2.0",
        "category": "Cybersecurity Framework", "clauses": "6 core functions",
        "desc": "Cybersecurity framework spanning Govern, Identify, Protect, Detect, Respond, Recover.",
        "icon": "cpu", "recommended": True
    },
    {
        "id": 109, "code": "PCIDSSV4", "standard": "PCI DSS v4.0",
        "category": "Payment Card Security", "clauses": "12 core requirements",
        "desc": "Payment card industry data security standards protecting cardholder data.",
        "icon": "credit-card"
    },
    {
        "id": 110, "code": "COBIT2019", "standard": "COBIT 2019",
        "category": "IT Governance", "clauses": "5 domains · 40 objectives",
        "desc": "Enterprise IT governance and management alignment framework.",
        "icon": "grid"
    },
    {
        "id": 111, "code": "TOGAFV10", "standard": "TOGAF Standard 10th Ed.",
        "category": "Enterprise Architecture", "clauses": "10 core content areas",
        "desc": "Enterprise architecture methodology and framework for IT alignment.",
        "icon": "layers"
    },
    {
        "id": 112, "code": "ISA62443", "standard": "ISA/IEC 62443 series",
        "category": "Industrial / OT Cybersecurity", "clauses": "7 foundational requirements",
        "desc": "Cybersecurity for operational technology (OT) and industrial automation systems.",
        "icon": "cpu"
    },
    {
        "id": 113, "code": "IEC61508", "standard": "IEC 61508",
        "category": "Functional Safety", "clauses": "7 parts",
        "desc": "Functional safety standard for electrical and electronic safety systems.",
        "icon": "zap"
    },
    {
        "id": 114, "code": "IEC61511", "standard": "IEC 61511",
        "category": "Process Safety", "clauses": "3 parts",
        "desc": "Functional safety for safety-instrumented systems in process industries.",
        "icon": "sliders"
    },
    {
        "id": 115, "code": "NERC-CIP", "standard": "NERC CIP",
        "category": "Critical Infrastructure", "clauses": "13 standards",
        "desc": "Critical infrastructure protection standards for bulk electric power utilities.",
        "icon": "zap"
    },
    {
        "id": 116, "code": "ISO27017", "standard": "ISO/IEC 27017:2015",
        "category": "Cloud Security", "clauses": "Cloud controls extension",
        "desc": "Information security controls guidance for cloud service customers and providers.",
        "icon": "cloud"
    },
    {
        "id": 117, "code": "ISO27701", "standard": "ISO/IEC 27701:2019",
        "category": "Privacy / PIMS", "clauses": "Privacy Extension to 27001",
        "desc": "Privacy Information Management System (PIMS) extension to ISO 27001.",
        "icon": "user-check"
    },
    {
        "id": 118, "code": "GDPR-EU", "standard": "GDPR (EU 2016/679)",
        "category": "European Privacy", "clauses": "99 articles",
        "desc": "General Data Protection Regulation compliance for European personal data.",
        "icon": "globe"
    },
    {
        "id": 119, "code": "EU-AI-ACT", "standard": "EU AI Act",
        "category": "Artificial Intelligence", "clauses": "Risk-based AI tiers",
        "desc": "European Union regulation on artificial intelligence governance and risk controls.",
        "icon": "terminal"
    }
]


class IntakeApiHandler(http.server.SimpleHTTPRequestHandler):
    """Custom request handler serving UI and REST API."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.join(ROOT, "intake/ui"), **kwargs)

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        path = url.path
        query = urllib.parse.parse_qs(url.query)

        if path == "/api/sample":
            sample_path = os.path.join(ROOT, "intake/sample_client_spec.json")
            if os.path.exists(sample_path):
                with open(sample_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.send_json_response(200, data)
            else:
                self.send_json_response(404, {"error": "Sample specification not found"})
            return

        if path == "/api/frameworks":
            self.send_json_response(200, {"frameworks": FRAMEWORKS_METADATA})
            return

        if path in ("/api/download-sql", "/api/download-spec"):
            cust_id = query.get("customer_id", [""])[0]
            if not CUSTOMER_ID_RE.match(cust_id):
                self.send_json_response(400, {"error": "Invalid customer_id"})
                return
            if path == "/api/download-sql":
                name, ctype, filename = sql_file_name(cust_id), "application/sql", sql_file_name(cust_id)
            else:
                name, ctype, filename = "client_spec.json", "application/json", f"{cust_id}_spec.json"
            target = os.path.join(DIST_DIR, cust_id, name)
            if not os.path.exists(target):
                self.send_json_response(404, {"error": f"No generated bundle for {cust_id}"})
                return
            with open(target, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return

        # Serve static UI files
        return super().do_GET()

    def do_POST(self):
        try:
            self._do_post()
        except LicenseSecretError as exc:
            # Validating needs no key, but sealing does: say what to set rather than fail with a stack trace.
            self.send_json_response(500, {"error": str(exc)})

    def _do_post(self):
        url = urllib.parse.urlparse(self.path)
        path = url.path

        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length)

        try:
            body = json.loads(post_data.decode("utf-8")) if post_data else {}
        except json.JSONDecodeError:
            self.send_json_response(400, {"error": "Invalid JSON in request body"})
            return
        if not isinstance(body, dict):
            self.send_json_response(400, {"error": "Request body must be a JSON object"})
            return

        if path == "/api/validate":
            errors = validate_spec(body)
            if errors:
                self.send_json_response(200, {"valid": False, "errors": errors})
            else:
                seal = compute_license_signature(
                    body["organization"]["customer_id"],
                    body["licensing_limits"],
                    body["selected_frameworks"],
                    body["enabled_modules"]
                )
                self.send_json_response(200, {
                    "valid": True,
                    "errors": [],
                    "license_seal": seal,
                    "summary": {
                        "customer": body["organization"]["customer_name"],
                        "max_users": body["licensing_limits"]["max_users"],
                        "max_vcisos": body["licensing_limits"]["max_vcisos"],
                        "max_org_owners": body["licensing_limits"]["max_org_owners"],
                        "max_it_admins": body["licensing_limits"].get("max_it_admins"),
                        "frameworks_count": len(body["selected_frameworks"]),
                        "modules_count": len(body["enabled_modules"]),
                    }
                })
            return

        if path == "/api/generate":
            errors = validate_spec(body)
            if errors:
                self.send_json_response(400, {"error": "Validation failed", "details": errors})
                return
            if not os.path.exists(EXCEL_PATH):
                self.send_json_response(500, {"error": f"Master workbook not found: {os.path.relpath(EXCEL_PATH, ROOT)}"})
                return

            cust_id = body["organization"]["customer_id"]
            cust_dir = os.path.join(DIST_DIR, cust_id)
            replaced = os.path.exists(os.path.join(cust_dir, "client_spec.json"))
            body["license_seal"] = compute_license_signature(
                cust_id,
                body["licensing_limits"],
                body["selected_frameworks"],
                body["enabled_modules"]
            )

            try:
                os.makedirs(cust_dir, exist_ok=True)
                with open(os.path.join(cust_dir, "client_spec.json"), "w", encoding="utf-8") as f:
                    json.dump(body, f, indent=2)
                sql_file = os.path.join(cust_dir, sql_file_name(cust_id))
                build_client_schema(body, EXCEL_PATH, sql_file)
                write_deployment_files(body, cust_dir)
            except Exception as exc:
                self.send_json_response(500, {"error": f"Generation failed: {exc}"})
                return

            with open(sql_file, "r", encoding="utf-8") as f:
                sql_lines = f.read().splitlines()
            if len(sql_lines) > 210:
                sql_preview = "\n".join(sql_lines[:150] + ["", "-- ... controls and seeds omitted in preview ...", ""] + sql_lines[-60:])
            else:
                sql_preview = "\n".join(sql_lines)

            self.send_json_response(200, {
                "success": True,
                "customer_id": cust_id,
                "replaced": replaced,
                "license_seal": body["license_seal"],
                "sql_lines": len(sql_lines),
                "sql_preview": sql_preview,
                "files_generated": [
                    f"dist_client/{cust_id}/{name}"
                    for name in ("client_spec.json", sql_file_name(cust_id), "initial_credentials.txt",
                                 "instance.json", "docker-compose.yml", "README.md")
                ],
            })
            return

        self.send_json_response(404, {"error": "Endpoint not found"})

    def send_json_response(self, code, payload):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)


def run_server(port=5050):
    handler = IntakeApiHandler
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", port), handler) as httpd:
        print(f"\n" + "=" * 65)
        print(f"  CyberTrustWorks Client Intake UI Server")
        print(f"  Running at: http://localhost:{port}")
        print(f"  Press Ctrl+C to stop the server")
        print("=" * 65 + "\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run CyberTrustWorks Client Intake Server")
    parser.add_argument("--port", type=int, default=5050, help="HTTP port (default: 5050)")
    args = parser.parse_args()
    run_server(args.port)

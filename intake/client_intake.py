#!/usr/bin/env python3
"""CyberTrustWorks Client Intake CLI and Validator

Collects and validates all client organization requirements, framework selections,
seat limits, and role quotas to produce a certified client specification.

Usage:
    # Validate an existing client specification:
    python3 intake/client_intake.py --validate intake/sample_client_spec.json

    # Run interactive intake questionnaire:
    python3 intake/client_intake.py --wizard --out client_spec.json

    # Generate signed license token for a spec:
    python3 intake/client_intake.py --seal intake/sample_client_spec.json
"""

import argparse
import hashlib
import hmac
import json
import os
import re
import sys
from datetime import datetime

# Master frameworks catalogue
FRAMEWORK_CATALOGUE = {
    101: "ISO 9001:2015 (Quality Management System)",
    102: "ISO/IEC 27001:2022 (Information Security Management System - ISMS)",
    103: "DPDPA 2023 (Digital Personal Data Protection Act - India)",
    104: "ISO 22301:2019 (Business Continuity Management System - BCMS)",
    105: "ISO 31000:2018 (Risk Management Guidelines)",
    106: "ISO 45001:2018 (Occupational Health and Safety)",
    107: "NIST SP 800-53 Rev. 5 (Security and Privacy Controls)",
    108: "NIST Cybersecurity Framework (CSF) 2.0",
    109: "PCI DSS v4.0 (Payment Card Industry Data Security Standard)",
    110: "COBIT 2019 (Information & Technology Governance)",
    111: "TOGAF Standard 10th Ed. (Enterprise Architecture)",
    112: "ISA/IEC 62443 (Industrial Automation & Control Systems)",
    113: "IEC 61508 (Functional Safety)",
    114: "IEC 61511 (Functional Safety - Process Industry)",
    115: "NERC CIP (Critical Infrastructure Protection)",
    116: "ISO/IEC 27017:2015 (Cloud Security Controls)",
    117: "ISO/IEC 27701:2019 (Privacy Information Management System - PIMS)",
    118: "GDPR (General Data Protection Regulation - EU)",
    119: "EU AI Act (Artificial Intelligence Governance)",
}

AVAILABLE_MODULES = [
    "compliance",
    "vulnerabilities",
    "alerting",
    "mobile_access",
    "news_breach_watch",
    "onprem_ai_assessment",
    "incidents",
]

class LicenseSecretError(RuntimeError):
    """CTW_LICENSE_SECRET is missing or too short to seal a licence."""


def license_secret():
    """The key that seals licences. Only from the environment: a default in the code would let anyone
    with the source seal a licence."""
    secret = os.environ.get("CTW_LICENSE_SECRET", "")
    if len(secret) < 32:
        raise LicenseSecretError("CTW_LICENSE_SECRET must be set to at least 32 characters to seal a licence")
    return secret


def compute_license_signature(customer_id, limits, frameworks, modules):
    """Generates a cryptographic HMAC-SHA256 signature for the client license."""
    payload = {
        "customer_id": customer_id,
        "max_users": limits["max_users"],
        "max_vcisos": limits["max_vcisos"],
        "max_org_owners": limits["max_org_owners"],
        "max_api_integrations": limits["max_api_integrations"],
        "max_frameworks": limits["max_frameworks"],
        "valid_to": limits["valid_to"],
        "frameworks": sorted([f["framework_id"] for f in frameworks]),
        "modules": sorted(modules),
    }
    encoded = json.dumps(payload, sort_keys=True).encode("utf-8")
    return hmac.new(license_secret().encode("utf-8"), encoded, hashlib.sha256).hexdigest()


def spec_seal(spec):
    """The seal of a validated spec's licence (customer, limits, frameworks, modules)."""
    return compute_license_signature(spec["organization"]["customer_id"], spec["licensing_limits"],
                                     spec["selected_frameworks"], spec["enabled_modules"])


CUSTOMER_ID_RE = re.compile(r"^[A-Za-z0-9_-]{3,32}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
CATEGORIES = {"Enterprise", "Mid-Market", "SMB", "Government", "Financial Institution"}
OFFICE_TYPES = {"Primary", "Secondary", "Data Center", "Regional Office"}
CONTACT_TYPES = {"Executive", "Primary vCISO", "IT Security", "Escalation", "Emergency"}
ROLE_TYPES = {"vCISO", "Organisation Owner", "IT Admin", "Control Owner", "Auditor", "Viewer"}


def _parse_date(value):
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except (TypeError, ValueError):
        return None


def _is_int(value):
    return isinstance(value, int) and not isinstance(value, bool)


def validate_spec(spec):
    """Performs deep validation on the client specification and enforcement quotas."""
    errors = []

    # 1. Organization checks
    org = spec.get("organization", {})
    customer_id = org.get("customer_id")
    if not customer_id:
        errors.append("organization.customer_id is required")
    elif not isinstance(customer_id, str) or not CUSTOMER_ID_RE.match(customer_id):
        errors.append("organization.customer_id must be 3-32 characters: letters, digits, '_' or '-'")
    if not org.get("customer_name"):
        errors.append("organization.customer_name is required")
    if org.get("category") not in CATEGORIES:
        errors.append(f"organization.category must be one of {sorted(CATEGORIES)}")
    for field in ("industry", "primary_domain"):
        if not org.get(field):
            errors.append(f"organization.{field} is required")

    offices = org.get("offices", [])
    if not offices:
        errors.append("At least one office must be specified")
    office_ids = [o.get("office_id") for o in offices]
    if len(set(office_ids)) != len(office_ids):
        errors.append("Office IDs must be unique")
    office_ids = set(office_ids)
    if offices and sum(1 for o in offices if o.get("office_type") == "Primary") != 1:
        errors.append("Exactly one office must be of type 'Primary'")
    for o in offices:
        if o.get("office_type") not in OFFICE_TYPES:
            errors.append(f"Office {o.get('office_id')}: office_type must be one of {sorted(OFFICE_TYPES)}")
        for field in ("office_address", "country", "state", "city", "pincode"):
            if not o.get(field):
                errors.append(f"Office {o.get('office_id')}: {field} is required")

    for c in org.get("contacts", []):
        who = c.get("contact_person") or c.get("contact_id")
        if c.get("contact_type") not in CONTACT_TYPES:
            errors.append(f"Contact {who}: contact_type must be one of {sorted(CONTACT_TYPES)}")
        if c.get("office_id") not in office_ids:
            errors.append(f"Contact {who} references unknown office_id: {c.get('office_id')}")
        if not EMAIL_RE.match(c.get("contact_email") or ""):
            errors.append(f"Contact {who}: contact_email is not a valid email address")
        if not c.get("contact_phone"):
            errors.append(f"Contact {who}: contact_phone is required")
        for field in ("contact_person", "designation"):
            if not c.get(field):
                errors.append(f"Contact {who}: {field} is required")
        if not _is_int(c.get("contact_priority")) or c.get("contact_priority") < 1:
            errors.append(f"Contact {who}: contact_priority must be a whole number >= 1")

    # 2. Contract
    contract = spec.get("contract", {})
    start = _parse_date(contract.get("contract_start_date"))
    end = _parse_date(contract.get("contract_end_date"))
    if not start:
        errors.append("contract.contract_start_date must be a YYYY-MM-DD date")
    if not end:
        errors.append("contract.contract_end_date must be a YYYY-MM-DD date")
    if start and end and end <= start:
        errors.append("contract.contract_end_date must be after contract_start_date")
    months = contract.get("contract_period_months")
    if not _is_int(months) or not 1 <= months <= 60:
        errors.append("contract.contract_period_months must be a whole number between 1 and 60")
    fy = contract.get("financial_year")
    if not _is_int(fy) or not 2024 <= fy <= 2050:
        errors.append("contract.financial_year must be a year between 2024 and 2050")
    elif start and fy != (start.year if start.month >= 4 else start.year - 1):
        # Financial Year Master: FY_ID 2026 runs April 2026 - March 2027
        errors.append(f"contract.financial_year {fy} does not match contract_start_date {contract.get('contract_start_date')} "
                      f"(financial years run April - March, so it falls in {start.year if start.month >= 4 else start.year - 1})")
    value = contract.get("contract_value", 0)
    if not isinstance(value, (int, float)) or isinstance(value, bool) or value < 0:
        errors.append("contract.contract_value must be a number >= 0")
    for field in ("contract_id", "customer_ref_po", "currency"):
        if not contract.get(field):
            errors.append(f"contract.{field} is required")
    if contract.get("invoicing_frequency") not in ("M", "Q", "H", "Y"):
        errors.append("contract.invoicing_frequency must be one of M, Q, H, Y")

    # 3. Licensing quotas
    limits = spec.get("licensing_limits", {})

    def limit(name, minimum):
        v = limits.get(name)
        if not _is_int(v):
            errors.append(f"licensing_limits.{name} must be a whole number")
            return None
        if v < minimum:
            errors.append(f"licensing_limits.{name} must be >= {minimum}")
        return v

    max_users = limit("max_users", 1)
    max_vcisos = limit("max_vcisos", 1)
    max_org_owners = limit("max_org_owners", 1)
    max_apis = limit("max_api_integrations", 0)
    max_frameworks = limit("max_frameworks", 1)
    max_control_owners = limit("max_control_owners", 1) if "max_control_owners" in limits else None

    # Cross-checks only run on quotas that parsed, so one bad value doesn't cascade.
    if None not in (max_control_owners, max_users) and max_control_owners >= max_users:
        errors.append("licensing_limits.max_control_owners must be less than max_users")
    if None not in (max_vcisos, max_org_owners, max_users) and max_vcisos + max_org_owners > max_users:
        errors.append("Sum of max_vcisos and max_org_owners cannot exceed total max_users")

    # Expiry date
    valid_to = limits.get("valid_to")
    exp_date = _parse_date(valid_to)
    if not valid_to:
        errors.append("licensing_limits.valid_to date is required")
    elif not exp_date:
        errors.append("licensing_limits.valid_to must be in YYYY-MM-DD format")
    else:
        if exp_date < datetime.now():
            errors.append(f"licensing_limits.valid_to ({valid_to}) is already in the past")
        if start and exp_date <= start:
            errors.append("licensing_limits.valid_to must be after contract_start_date (licence start)")

    # 4. Selected Frameworks
    frameworks = spec.get("selected_frameworks", [])
    if not frameworks:
        errors.append("At least one framework must be selected")
    if max_frameworks is not None and len(frameworks) > max_frameworks:
        errors.append(f"Selected frameworks count ({len(frameworks)}) exceeds max_frameworks limit ({max_frameworks})")
    fids = [f.get("framework_id") for f in frameworks]
    if len(set(fids)) != len(fids):
        errors.append("Each framework may only be selected once")

    for f in frameworks:
        fid = f.get("framework_id")
        if fid not in FRAMEWORK_CATALOGUE:
            errors.append(f"Invalid framework_id: {fid}. Must be one of {list(FRAMEWORK_CATALOGUE.keys())}")
        if not f.get("office_ids"):
            errors.append(f"Framework {fid} must apply to at least one office")
        for off in f.get("office_ids", []):
            if off not in office_ids:
                errors.append(f"Framework {fid} references unknown office_id: {off}")
        # Review interval per office (optional; else the framework's review_frequency_months).
        for off, months in (f.get("office_review_months") or {}).items():
            if off not in f.get("office_ids", []):
                errors.append(f"Framework {fid}: review months given for office {off}, which it does not apply to")
            if not (isinstance(months, int) and not isinstance(months, bool) and months > 0):
                errors.append(f"Framework {fid}: review months for office {off} must be a whole number > 0")

    # 5. Modules
    modules = spec.get("enabled_modules", [])
    if not modules:
        errors.append("enabled_modules cannot be empty")
    if "compliance" not in modules:
        errors.append("Module 'compliance' is mandatory and must be included in enabled_modules")
    for m in modules:
        if m not in AVAILABLE_MODULES:
            errors.append(f"Unknown module '{m}'. Available: {AVAILABLE_MODULES}")
    if "news_breach_watch" in modules and "alerting" not in modules:
        # Architecture D3: every alert, news included, is delivered by the alert engine
        errors.append("Module 'news_breach_watch' requires the 'alerting' module")

    # 6. Integrations check
    integrations = spec.get("integrations", {}).get("tools", [])
    active_tools = [t for t in integrations if t.get("enabled")]
    for t in integrations:
        if not _is_int(t.get("pull_frequency_per_day")) or t.get("pull_frequency_per_day") < 1:
            errors.append(f"Tool {t.get('tool_name')}: pull_frequency_per_day must be a whole number >= 1")
    if active_tools and "vulnerabilities" not in modules:
        errors.append("Scanner tool integrations require the 'vulnerabilities' module")
    if max_apis is not None and len(active_tools) > max_apis:
        errors.append(f"Configured active scanner tools ({len(active_tools)}) exceed max_api_integrations ({max_apis})")

    # 7. News watch profile is required when the module is licensed
    if "news_breach_watch" in modules:
        watch = spec.get("news_watch_profile") or {}
        if not (watch.get("monitored_names") or watch.get("monitored_domains")):
            errors.append("news_breach_watch needs at least one monitored name or domain")

    # 8. Initial users check against quotas
    users = spec.get("initial_users", [])
    if not users:
        errors.append("At least one initial user is required")
    if max_users is not None and len(users) > max_users:
        errors.append(f"Initial users count ({len(users)}) exceeds max_users seat limit ({max_users})")

    for key, label in (("user_id", "user IDs"), ("login_id", "login IDs"), ("user_email", "user emails")):
        values = [str(u.get(key, "")).lower() for u in users]
        if len(set(values)) != len(values):
            errors.append(f"Initial {label} must be unique")
    for u in users:
        who = u.get("user_name") or u.get("user_id")
        if not u.get("user_name") or not u.get("login_id"):
            errors.append(f"Initial user {who}: user_name and login_id are required")
        if not EMAIL_RE.match(u.get("user_email") or ""):
            errors.append(f"Initial user {who}: user_email is not a valid email address")
        if u.get("role_type") not in ROLE_TYPES:
            errors.append(f"Initial user {who}: role_type must be one of {sorted(ROLE_TYPES)}")
        if u.get("office_id") not in office_ids:
            errors.append(f"Initial user {who} references unknown office_id: {u.get('office_id')}")

    vciso_users = [u for u in users if u.get("role_type") == "vCISO"]
    if max_vcisos is not None and len(vciso_users) > max_vcisos:
        errors.append(f"Initial vCISO users ({len(vciso_users)}) exceed max_vcisos quota ({max_vcisos})")

    if users and not any(u.get("role_type") == "IT Admin" for u in users):
        errors.append("At least one initial user must be an IT Admin")

    # Every licensed Organisation Owner seat is filled at onboarding: exactly max_org_owners of them.
    org_owner_users = [u for u in users if u.get("role_type") == "Organisation Owner"]
    if max_org_owners is not None and len(org_owner_users) != max_org_owners:
        errors.append(f"Initial Organisation Owner users ({len(org_owner_users)}) must equal max_org_owners ({max_org_owners})")

    return errors


def run_wizard():
    """Interactive command-line intake questionnaire for onboarding a client."""
    print("=" * 70)
    print("  CyberTrustWorks - Client Onboarding & Licensing Intake Wizard")
    print("=" * 70)
    print("This wizard collects all parameters to build a client-specific")
    print("Docker image and custom PostgreSQL schema with strict quota limits.\n")

    # 1. Organization Details
    print("--- 1. Organization Details ---")
    customer_id = input("Client Identifier Code (e.g. Cust_00101, ACME_CORP): ").strip() or "Cust_00101"
    customer_name = input("Legal Company Name: ").strip() or "Acme Technologies Ltd."
    industry = input("Industry Sector (e.g. Banking, Healthcare, SaaS): ").strip() or "Banking & Financial Services"
    primary_domain = input("Primary Corporate Domain (e.g. acme.com): ").strip() or "acme.com"
    deployment_fqdn = input("Planned Deployment FQDN (e.g. vciso.acme.com): ").strip() or f"vciso.{primary_domain}"

    # Offices
    offices = []
    print("\n--- 2. Office Locations ---")
    office_id_primary = f"{customer_id}_001"
    city = input("Primary Office City (HQ) [default: Mumbai]: ").strip() or "Mumbai"
    country = input("Primary Office Country [default: India]: ").strip() or "India"
    offices.append({
        "office_id": office_id_primary,
        "office_type": "Primary",
        "office_address": f"HQ, {city}",
        "city": city,
        "state": "State",
        "country": country,
        "pincode": "000000",
    })

    # Licensing limits
    print("\n--- 3. Seat Licenses & Role Quotas (HARD CONSTRAINTS) ---")
    print("Note: The client organization will NOT be able to add any more")
    print("users or vCISOs than what is configured here.\n")

    while True:
        try:
            total_users_in = input("Total number of user accounts needed [default: 25]: ").strip() or "25"
            max_users = int(total_users_in)
            vciso_in = input("How many vCISOs need access? [default: 2]: ").strip() or "2"
            max_vcisos = int(vciso_in)
            owner_in = input("How many Organisation Owners / Executives need access? [default: 1]: ").strip() or "1"
            max_org_owners = int(owner_in)
            api_in = input("How many external security tool API integrations? [default: 10]: ").strip() or "10"
            max_apis = int(api_in)
            break
        except ValueError:
            print("Please enter valid integers.")

    valid_to = input("License Expiry Date (YYYY-MM-DD) [default: 2027-03-31]: ").strip() or "2027-03-31"

    # Framework selection
    print("\n--- 4. Compliance Framework Selection ---")
    print("Select frameworks from the Master Catalogue:")
    for fid, fname in FRAMEWORK_CATALOGUE.items():
        print(f"  [{fid}] {fname}")

    fw_choices = input("\nEnter framework IDs separated by commas [default: 102, 103]: ").strip() or "102, 103"
    selected_fids = [int(x.strip()) for x in fw_choices.split(",") if x.strip()]
    selected_frameworks = []
    for fid in selected_fids:
        selected_frameworks.append({
            "framework_id": fid,
            "office_ids": [office_id_primary],
            "review_frequency_months": 12,
        })

    # Module selection
    print("\n--- 5. Feature Modules Selection ---")
    print("Available platform modules:")
    for i, mod in enumerate(AVAILABLE_MODULES, 1):
        print(f"  {i}. {mod}")
    print("Compliance is mandatory.")
    include_vuln = input("Enable Vulnerabilities Scanner & Finding Engine? (y/n) [y]: ").strip().lower() != "n"
    include_alerts = input("Enable Instant Alert Engine & Escalation? (y/n) [y]: ").strip().lower() != "n"
    include_mobile = input("Enable Mobile App Access? (y/n) [y]: ").strip().lower() != "n"
    include_news = input("Enable News & Breach Watch (Companion Cloud)? (y/n) [y]: ").strip().lower() != "n"
    include_ai = input("Enable On-premise AI Evidence Assessment? (y/n) [n]: ").strip().lower() == "y"
    include_inc = input("Enable Incident Response Module? (y/n) [y]: ").strip().lower() != "n"

    enabled_modules = ["compliance"]
    if include_vuln: enabled_modules.append("vulnerabilities")
    if include_alerts: enabled_modules.append("alerting")
    if include_mobile: enabled_modules.append("mobile_access")
    if include_news: enabled_modules.append("news_breach_watch")
    if include_ai: enabled_modules.append("onprem_ai_assessment")
    if include_inc: enabled_modules.append("incidents")

    # Initial users
    print("\n--- 6. Primary vCISO Account ---")
    vciso_name = input("vCISO Full Name [default: Priya Sharma]: ").strip() or "Priya Sharma"
    vciso_email = input("vCISO Corporate Email [default: priya.sharma@acme.com]: ").strip() or "priya.sharma@acme.com"

    spec = {
        "organization": {
            "customer_id": customer_id,
            "customer_name": customer_name,
            "category": "Enterprise",
            "industry": industry,
            "primary_domain": primary_domain,
            "deployment_fqdn": deployment_fqdn,
            "offices": offices,
            "contacts": [
                {
                    "contact_id": f"{office_id_primary}_0001",
                    "office_id": office_id_primary,
                    "contact_type": "Primary vCISO",
                    "contact_priority": 1,
                    "contact_person": vciso_name,
                    "designation": "vCISO",
                    "department": "Information Security",
                    "contact_email": vciso_email,
                    "contact_phone": "+91-98000-00000",
                }
            ],
        },
        "contract": {
            "contract_id": f"CTR_{customer_id}_01",
            "customer_ref_po": f"PO_{customer_id}_2026",
            "contract_type": "Original",
            "financial_year": 2026,
            "contract_period_months": 12,
            "contract_start_date": "2026-04-01",
            "contract_end_date": valid_to,
            "contract_value": 1000000.0,
            "currency": "USD",
            "invoicing_frequency": "M",
        },
        "licensing_limits": {
            "max_users": max_users,
            "max_vcisos": max_vcisos,
            "max_org_owners": max_org_owners,
            "max_control_owners": max(10, max_users - max_vcisos - max_org_owners),
            "max_api_integrations": max_apis,
            "max_frameworks": len(selected_frameworks),
            "valid_to": valid_to,
        },
        "selected_frameworks": selected_frameworks,
        "enabled_modules": enabled_modules,
        "integrations": {
            "tools": [
                {"tool_name": "Tenable", "enabled": True, "target_endpoint": "https://cloud.tenable.com", "pull_frequency_per_day": 2}
            ] if include_vuln else []
        },
        "news_watch_profile": {
            "monitored_names": [customer_name],
            "monitored_domains": [primary_domain],
            "monitored_cities": [city],
            "custom_keywords": ["breach", "hack"],
        } if include_news else {},
        "security_policies": {
            "sso_type": "LOCAL",
            "mfa_enforced": True,
            "password_expiry_days": 90,
            "session_timeout_minutes": 15,
        },
        "initial_users": [
            {
                "user_id": "User_0001",
                "login_id": vciso_email.split("@")[0],
                "user_name": vciso_name,
                "user_email": vciso_email,
                "user_mobile": "+91-98000-00000",
                "designation": "vCISO",
                "department": "Information Security",
                "role_type": "vCISO",
                "office_id": office_id_primary,
            }
        ],
    }

    # Seal with HMAC
    spec["license_seal"] = compute_license_signature(customer_id, spec["licensing_limits"], selected_frameworks, enabled_modules)
    return spec


def main():
    parser = argparse.ArgumentParser(description="CyberTrustWorks Client Intake CLI")
    parser.add_argument("--validate", help="Path to client_spec.json to validate")
    parser.add_argument("--wizard", action="store_true", help="Launch interactive intake questionnaire")
    parser.add_argument("--seal", help="Compute HMAC signature for a spec file and print")
    parser.add_argument("--out", help="Output file path for wizard spec", default="client_spec.json")

    args = parser.parse_args()

    if args.wizard:
        spec = run_wizard()
        errors = validate_spec(spec)
        if errors:
            print("\nValidation failed with errors:")
            for e in errors:
                print(f"  - {e}")
            sys.exit(1)
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(spec, f, indent=2)
        print(f"\n[SUCCESS] Client specification generated and written to {args.out}")
        print(f"License Seal: {spec['license_seal']}")
        return

    if args.validate:
        with open(args.validate, "r", encoding="utf-8") as f:
            spec = json.load(f)
        errors = validate_spec(spec)
        if errors:
            print(f"[FAIL] Validation errors found in {args.validate}:")
            for e in errors:
                print(f"  - {e}")
            sys.exit(1)
        else:
            print(f"[PASS] Client specification {args.validate} is valid and fully compliant!")
            print(f"  Customer: {spec['organization']['customer_name']} ({spec['organization']['customer_id']})")
            print(f"  Seat Limits: Users={spec['licensing_limits']['max_users']}, vCISOs={spec['licensing_limits']['max_vcisos']}, OrgOwners={spec['licensing_limits']['max_org_owners']}")
            print(f"  Frameworks: {[f['framework_id'] for f in spec['selected_frameworks']]}")
            print(f"  Modules: {spec['enabled_modules']}")
            # Validating needs no secret; the seal is shown only where the key is available.
            try:
                print(f"  Computed License Seal: {spec_seal(spec)}")
            except LicenseSecretError:
                print("  License Seal: not computed (CTW_LICENSE_SECRET is not set)")
            return

    if args.seal:
        with open(args.seal, "r", encoding="utf-8") as f:
            spec = json.load(f)
        seal = spec_seal(spec)
        spec["license_seal"] = seal
        with open(args.seal, "w", encoding="utf-8") as f:
            json.dump(spec, f, indent=2)
        print(f"[SEALED] License seal computed and updated in {args.seal}: {seal}")
        return

    parser.print_help()


if __name__ == "__main__":
    try:
        main()
    except LicenseSecretError as exc:
        sys.exit(f"Error: {exc}")

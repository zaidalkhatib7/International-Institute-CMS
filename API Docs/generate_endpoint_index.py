"""Generate the endpoint index straight from Laravel's router.

Typed-by-hand API tables drift the moment somebody adds a route. This reads
`php artisan route:list --json` so the index cannot describe endpoints that do
not exist, or miss ones that do.
"""
import json
import os
import re
from collections import OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
ROUTES = os.path.join(HERE, "routes.json")
OUT = os.path.join(HERE, "api_index.md")

# Endpoints added in the work this handoff covers. Marked so the reader can see
# what is new without diffing two documents.
NEW = [
    "api/v1/admin/programs/{id}/seed-pack/propose",
    "api/v1/admin/programs/{id}/seed-pack/approve",
    "api/v1/admin/programs/{id}/question-bank",
    "api/v1/admin/programs/{id}/content-tree",
    "api/v1/admin/activities/{id}",
]

GROUPS = OrderedDict([
    ("Authentication & account", [r"^api/v1/(auth|account|login|logout|register|password|email)"]),
    ("Public catalogue", [r"^api/v1/(programs|categories|pages|news|experts|library|search|home)(/|$)"]),
    ("Learner journey", [r"^api/v1/(enrollments|progress|lessons|quizzes|attempts|assignments|certificates|wallet|notifications)(/|$)"]),
    ("RPL — applicant", [r"^api/v1/rpl(?!/admin)"]),
    ("Admin — programmes & packages", [r"^api/v1/admin/(programs|categories)"]),
    ("Admin — learning content", [r"^api/v1/admin/(sections|lessons|quizzes|quiz-questions|activities|media)"]),
    ("Admin — RPL", [r"^api/v1/admin/rpl"]),
    ("Admin — users & access", [r"^api/v1/admin/(users|roles|permissions|access|experts)"]),
    ("Admin — governance & operations", [r"^api/v1/admin/(audit|governance|assurance|settings|reports|finance|support|integration)"]),
])


def permission_of(mw):
    # route:list --json resolves middleware ALIASES to class names, so the
    # string is "App\Http\Middleware\EnsurePermission:learning.manage",
    # never "permission:learning.manage". Matching the alias found nothing and
    # rendered an empty column on all 243 admin rows.
    for m in mw:
        if "EnsurePermission:" in m:
            return m.split("EnsurePermission:", 1)[1]
    return None


def extras_of(mw):
    """Guards a caller needs to know about beyond the permission."""
    out = []
    joined = " ".join(mw)
    if "EnsurePackageEditable" in joined:
        out.append("package must be editable")
    for m in mw:
        if "ThrottleRequests:" in m:
            out.append("throttle " + m.split("ThrottleRequests:", 1)[1])
    return ", ".join(out) or "—"


def auth_of(mw):
    joined = " ".join(mw)
    if "sanctum" in joined:
        return "token"
    return "public"


def group_of(uri):
    for name, patterns in GROUPS.items():
        for p in patterns:
            if re.search(p, uri):
                return name
    return "Admin — other" if "/admin/" in uri else "Other"


def main():
    routes = json.load(open(ROUTES, encoding="utf-8"))
    api = [r for r in routes if r["uri"].startswith("api/v1/")]

    buckets = OrderedDict((g, []) for g in list(GROUPS) + ["Admin — other", "Other"])
    for r in api:
        buckets[group_of(r["uri"])].append(r)

    lines = []
    lines.append("## Complete endpoint index\n")
    lines.append(
        "Generated from `php artisan route:list`, so it matches the deployed router exactly. "
        "**{}** endpoints under `/api/v1`. Rows marked **NEW** are the ones this handoff documents in detail above.\n".format(len(api))
    )

    for group, rows in buckets.items():
        if not rows:
            continue
        rows.sort(key=lambda r: (r["uri"], r["method"]))
        lines.append("\n### {} ({})\n".format(group, len(rows)))
        lines.append("| Method | Endpoint | Auth | Permission | Notes |")
        lines.append("| --- | --- | --- | --- | --- |")
        for r in rows:
            methods = r["method"].replace("|HEAD", "")
            uri = "/" + r["uri"]
            perm = permission_of(r["middleware"]) or "—"
            auth = auth_of(r["middleware"])
            flag = " **NEW**" if r["uri"] in NEW else ""
            lines.append("| `{}` | `{}`{} | {} | `{}` | {} |".format(
                methods, uri, flag, auth, perm, extras_of(r["middleware"])))

    open(OUT, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("wrote", OUT)
    print("endpoints:", len(api))
    for g, rows in buckets.items():
        if rows:
            print("  {:38s} {}".format(g, len(rows)))


if __name__ == "__main__":
    main()

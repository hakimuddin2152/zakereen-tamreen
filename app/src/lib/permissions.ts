/**
 * RBAC — single source of truth for all permission checks.
 *
 * Role hierarchy (highest → lowest):
 *   GOD  – Developer / App Owner. Bypasses all checks.
 *   MC   – Mauze Coordinator. Manages all parties, sessions, Majlis.
 *   PC   – Party Coordinator. Manages own party. Inherits PM perms.
 *   PM   – Party Member. Manages own data. Has partyId set.
 *   IM   – Individual Member. Same perms as PM. No party (partyId null).
 */

export const Permission = {
  // ── Kalaams ──────────────────────────────────────────────────────────────
  KALAAM_VIEW:                 "kalaam:view",
  KALAAM_CREATE:               "kalaam:create",
  KALAAM_EDIT:                 "kalaam:edit",
  KALAAM_DELETE:               "kalaam:delete",

  // ── Parties ───────────────────────────────────────────────────────────────
  PARTY_VIEW:                  "party:view",
  PARTY_CREATE:                "party:create",         // MC only
  PARTY_EDIT:                  "party:edit",           // MC only
  PARTY_DELETE:                "party:delete",         // MC only
  PARTY_ASSIGN_COORDINATOR:    "party:assign_coordinator",  // MC only
  PARTY_ASSIGN_ANY_MEMBER:     "party:assign_any_member",   // MC: assign any IM to any party
  PARTY_ASSIGN_OWN_MEMBER:     "party:assign_own_member",   // PC: add PM to own party

  // ── Sessions ──────────────────────────────────────────────────────────────
  SESSION_CREATE_ANY:          "session:create_any",   // MC: any attendees
  SESSION_CREATE_PARTY:        "session:create_party", // PC: own party only
  SESSION_VIEW_ALL:            "session:view_all",     // MC
  SESSION_VIEW_PARTY:          "session:view_party",   // PC: sessions for their party
  SESSION_VIEW_OWN:            "session:view_own",     // PM/IM: attended only

  // ── Majlis ────────────────────────────────────────────────────────────────
  MAJLIS_VIEW:                 "majlis:view",
  MAJLIS_CREATE:               "majlis:create",        // MC
  MAJLIS_EDIT:                 "majlis:edit",          // MC
  MAJLIS_DELETE:               "majlis:delete",        // MC
  MAJLIS_ASSIGN_ANY:           "majlis:assign_any",    // MC: assign any user to kalaam
  MAJLIS_ASSIGN_PARTY:         "majlis:assign_party",  // PC: assign own party members only

  // ── Members & Grades ─────────────────────────────────────────────────────
  MEMBER_VIEW:                 "member:view",
  MEMBER_GRADE_SET_ANY:        "member:grade_set_any",    // MC: any member
  MEMBER_GRADE_SET_PARTY:      "member:grade_set_party",  // PC: own party only

  // ── Evaluation Requests ───────────────────────────────────────────────────
  EVAL_REQUEST_SUBMIT:         "eval_request:submit",         // PM / IM
  EVAL_REQUEST_REVIEW_ANY:     "eval_request:review_any",     // MC
  EVAL_REQUEST_REVIEW_PARTY:   "eval_request:review_party",   // PC: own party

  // ── Recordings ────────────────────────────────────────────────────────────
  RECORDING_UPLOAD:            "recording:upload",
  RECORDING_SHARE:             "recording:share",
  RECORDING_VIEW_ANY:          "recording:view_any",   // MC: can see any recording

  // ── Users ─────────────────────────────────────────────────────────────────
  USER_CREATE:                 "user:create",
  USER_DEACTIVATE:             "user:deactivate",
  USER_ROLE_CHANGE:            "user:role_change",     // GOD only
  USER_PASSWORD_RESET:         "user:password_reset",
  USER_PASSWORD_CHANGE_OWN:    "user:password_change_own",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

// ── Permission sets ──────────────────────────────────────────────────────────

/** Every authenticated user gets these. */
const BASE: Permission[] = [
  Permission.KALAAM_VIEW,
  Permission.PARTY_VIEW,
  Permission.MAJLIS_VIEW,
  Permission.MEMBER_VIEW,
  Permission.RECORDING_UPLOAD,
  Permission.RECORDING_SHARE,
  Permission.SESSION_VIEW_OWN,
  Permission.USER_PASSWORD_CHANGE_OWN,
  Permission.EVAL_REQUEST_SUBMIT,
];

/** Additional permissions for PC (on top of BASE). */
const PC_EXTRA: Permission[] = [
  Permission.KALAAM_CREATE,
  Permission.KALAAM_EDIT,
  Permission.SESSION_CREATE_PARTY,
  Permission.SESSION_VIEW_PARTY,
  Permission.PARTY_ASSIGN_OWN_MEMBER,
  Permission.MEMBER_GRADE_SET_PARTY,
  Permission.EVAL_REQUEST_REVIEW_PARTY,
  Permission.MAJLIS_ASSIGN_PARTY,
  Permission.USER_CREATE,
  Permission.USER_DEACTIVATE,
  Permission.USER_PASSWORD_RESET,
];

/** Additional permissions for MC (on top of BASE + PC_EXTRA). */
const MC_EXTRA: Permission[] = [
  Permission.KALAAM_DELETE,
  Permission.PARTY_CREATE,
  Permission.PARTY_EDIT,
  Permission.PARTY_DELETE,
  Permission.PARTY_ASSIGN_COORDINATOR,
  Permission.PARTY_ASSIGN_ANY_MEMBER,
  Permission.SESSION_CREATE_ANY,
  Permission.SESSION_VIEW_ALL,
  Permission.MAJLIS_CREATE,
  Permission.MAJLIS_EDIT,
  Permission.MAJLIS_DELETE,
  Permission.MAJLIS_ASSIGN_ANY,
  Permission.MEMBER_GRADE_SET_ANY,
  Permission.EVAL_REQUEST_REVIEW_ANY,
  Permission.RECORDING_VIEW_ANY,
  Permission.USER_ROLE_CHANGE,
];

// ── Role → Permission map ────────────────────────────────────────────────────

/**
 * Maps each role to its allowed permissions.
 * GOD is null — it bypasses all checks in `can()`.
 */
export const ROLE_PERMISSIONS: Record<string, Set<Permission> | null> = {
  IM:  new Set(BASE),
  PM:  new Set(BASE),
  PC:  new Set([...BASE, ...PC_EXTRA]),
  MC:  new Set([...BASE, ...PC_EXTRA, ...MC_EXTRA]),
  GOD: null, // null = bypass all checks
};

// ── Core helpers ─────────────────────────────────────────────────────────────

/**
 * Returns true if `role` has `permission`.
 * GOD always returns true.
 * Safe to call in client components (pass role as prop from RSC).
 */
export function can(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  if (role === "GOD") return true;
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/**
 * Use at the top of API route handlers.
 * Throws a 403 Response if the role does not have the permission.
 */
export function requirePermission(
  role: string | undefined | null,
  permission: Permission
): void {
  if (!can(role, permission)) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Returns true if role is MC or GOD.
 * Convenience for places that need "cross-party" access.
 */
export function isMC(role: string | undefined | null): boolean {
  return role === "MC" || role === "GOD";
}

/**
 * Returns true if role is PC, MC, or GOD.
 */
export function isCoordinator(role: string | undefined | null): boolean {
  return role === "PC" || role === "MC" || role === "GOD";
}

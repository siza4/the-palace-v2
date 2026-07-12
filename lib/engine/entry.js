'use server';

import { getMemberById, getMemberByRoyalId } from "../services/member.service";
import { getRoyalPass } from "../services/pass.service";
import { getMembershipStatus } from "./membership";
import { hasPermission } from "./permissions";

/**
 * Verify member entry into The Palace
 * Now includes Royal Standing and contribution status validation
 * @param {string} identifier - Member ID or Royal Pass ID
 * @returns {Promise<Object>} Entry result with member and pass data
 *
 * IMPORTANT: this function does DB lookups only — it never touches
 * Supabase Auth and never establishes a session. It must only ever be
 * called with an identifier already known to be correct because the
 * caller is authenticated (e.g. verifySession()'s resolved member.id,
 * server-side, after checking a real session token) — never with a
 * value typed by an unauthenticated client. It previously was called
 * that way from app/enter/page.js, which let anyone view any member's
 * private data by typing/guessing their Royal ID; that page has been
 * retired. The one authentication flow for The Palace is Supabase Auth
 * via /login; this function is now only a post-authentication
 * authorization check (is this already-verified member's Pass/Standing/
 * contribution status currently valid?), used by app/api/throne/route.js.
 */
export async function enterPalace(identifier) {
  try {
    let memberResult;

    if (identifier.startsWith("PLC-")) {
      memberResult = await getMemberByRoyalId(identifier);
    } else {
      memberResult = await getMemberById(identifier);
    }

    if (memberResult.error || !memberResult.data) {
      return {
        success: false,
        message: "Royal Identity not found"
      };
    }

    const member = memberResult.data;

    // Check member suspension status
    if (member.status === "Suspended") {
      return {
        success: false,
        message: "Palace access suspended"
      };
    }

    // Verify Royal Pass
    const passResult = await getRoyalPass(member.id);

    if (passResult.error) {
      return {
        success: false,
        message: "Unable to verify Royal Pass. Please try again."
      };
    }

    const pass = passResult.data;

    if (!pass) {
      return {
        success: false,
        message: "No Royal Pass found for this identity"
      };
    }

    if (!pass.active) {
      return {
        success: false,
        message: "Royal Pass inactive"
      };
    }

    // Verify Royal Standing
    const membershipStatus = await getMembershipStatus(member.id);

    if (membershipStatus.standingStatus === "suspended") {
      return {
        success: false,
        message: "Royal Standing has been suspended.",
        membershipStatus
      };
    }

    if (membershipStatus.contributionStatus === "lapsed") {
      return {
        success: false,
        message: "Your Royal Standing requires renewal.",
        membershipStatus
      };
    }

    return {
      success: true,
      member,
      pass,
      membershipStatus
    };
  } catch (error) {
    console.error('Error in enterPalace:', error);
    return {
      success: false,
      message: "An error occurred during entry verification"
    };
  }
}

/**
 * Verify member has permission to access specific area
 * @param {string} memberId - Member UUID
 * @param {string} permission - Permission name to check
 * @returns {Promise<boolean>} True if member has permission
 */
export async function verifyMemberPermission(memberId, permission) {
  try {
    return await hasPermission(memberId, permission);
  } catch (error) {
    console.error('Error verifying permission:', error);
    return false;
  }
}

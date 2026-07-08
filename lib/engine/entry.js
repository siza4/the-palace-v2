'use server';

import { getMemberById, getMemberByRoyalId } from "../services/member.service";
import { getRoyalPass } from "../services/pass.service";
import { getMembershipStatus } from "./membership";
import { hasPermission } from "./permissions";

/**
 * Verify member entry into The Palace
 * Now includes membership and subscription validation
 * @param {string} identifier - Member ID or Royal Pass ID
 * @returns {Promise<Object>} Entry result with member and pass data
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

    // NEW: Check membership status
    const membershipStatus = await getMembershipStatus(member.id);

    // Allow entry even without subscription (will be guest/visitor)
    // But track the membership status
    if (membershipStatus.subscription) {
      // Check if subscription is active
      if (membershipStatus.subscription.status === 'active' && membershipStatus.isActive) {
        // All good - active member
      } else if (membershipStatus.subscription.status === 'pending_approval') {
        return {
          success: false,
          message: "Membership awaiting approval",
          membershipStatus: 'pending_approval'
        };
      } else if (membershipStatus.subscription.status === 'expired' || !membershipStatus.isActive) {
        return {
          success: false,
          message: "Membership expired. Please renew.",
          membershipStatus: 'expired'
        };
      }
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

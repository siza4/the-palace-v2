import {
  getMemberById,
  getMemberByRoyalId,
} from "../services/member.service";

import {
  getRoyalPass,
} from "../services/pass.service";

export async function enterPalace(identifier) {
  let memberResult;

  if (identifier.startsWith("PLC-")) {
    memberResult = await getMemberByRoyalId(identifier);
  } else {
    memberResult = await getMemberById(identifier);
  }

  if (memberResult.error || !memberResult.data) {
    return {
      success: false,
      message: "Royal Identity not found",
    };
  }

  const member = memberResult.data;

  if (member.status === "Suspended") {
    return {
      success: false,
      message: "Palace access suspended",
    };
  }

  const passResult = await getRoyalPass(member.id);

  // Temporary debug
  alert(JSON.stringify(passResult));

  if (passResult.error || !passResult.data) {
    return {
      success: false,
      message: "Royal Pass inactive",
    };
  }

  const pass = passResult.data;

  if (!pass.active) {
    return {
      success: false,
      message: "Royal Pass inactive",
    };
  }

  return {
    success: true,
    member,
    pass,
  };
}

export type PalaceState =
  | "VOID"
  | "ENTRY"
  | "PAYMENT"
  | "IDENTITY"
  | "THRONE"
  | "LIVE"
  | "ARCHIVE"
  | "BUTLER"
  | "EXIT";

class StateMachine {
  private state: PalaceState = "VOID";

  getState() {
    return this.state;
  }

  transition(next: PalaceState) {
    this.state = next;
    console.log("Transition:", next);
  }
}

export const palaceState = new StateMachine();

"use client";

import { IconClose } from "@/components/icons";
import { SignInForm } from "./SignInForm";

type Props = {
  open: boolean;
  onClose: () => void;
  reason?: string;
};

export function SignInModal({ open, onClose, reason }: Props) {
  if (!open) return null;
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        style={{ maxWidth: 460 }}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head">
          <div>
            <span className="pill">Sign in</span>
            <h2 style={{ marginTop: 10 }}>
              {reason ?? "Sign in to continue"}
            </h2>
            <p>Email OTP. No passwords.</p>
          </div>
          <button className="close-x" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        <div className="modal-body">
          <SignInForm onSignedIn={onClose} />
        </div>
      </div>
    </div>
  );
}

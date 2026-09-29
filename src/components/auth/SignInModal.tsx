"use client";

import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/lib/i18n";
import { SignInForm } from "./SignInForm";

export function SignInModal({ open, onClose, reason }: { open: boolean; onClose: () => void; reason?: string }) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} title={reason ?? t("auth.reason")} width={440}>
      <p className="hint" style={{ fontSize: 13.5 }}>{t("auth.body")}</p>
      <SignInForm onSignedIn={onClose} />
    </Modal>
  );
}

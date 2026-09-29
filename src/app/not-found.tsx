import Link from "next/link";
import { getServerT } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getServerT();
  return (
    <div className="center-page">
      <div>
        <h1>{t("errors.notFoundTitle")}</h1>
        <p>{t("errors.notFoundBody")}</p>
        <Link className="btn primary" href="/">
          {t("errors.goHome")}
        </Link>
      </div>
    </div>
  );
}

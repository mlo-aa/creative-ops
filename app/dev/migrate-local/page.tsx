import { notFound } from "next/navigation";
import { MigrateLocalClient } from "./MigrateLocalClient";

export default function MigrateLocalPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <MigrateLocalClient />;
}

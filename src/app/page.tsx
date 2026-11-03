import { redirect } from "next/navigation";

// A raiz é a vitrine pública do projeto. O painel com senha fica em /dashboard.
export default function Home() {
  redirect("/demo");
}

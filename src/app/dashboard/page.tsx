import { redirect } from "next/navigation";

// O painel virou a página inicial: os links de cada pessoa ficam no navegador dela.
export default function OldDashboard() {
  redirect("/");
}

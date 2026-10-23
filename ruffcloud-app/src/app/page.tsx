import { redirect } from "next/navigation"

export default function Home() {
  // TODO: switch back to "/login" once auth is wired up
  redirect("/dashboard")
}
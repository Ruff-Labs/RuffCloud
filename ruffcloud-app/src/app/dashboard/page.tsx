import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { RaceResults } from "@/components/race-results"
import { sampleRows } from "@/lib/races"
async function fakeFetch() {
  await new Promise((resolve) => setTimeout(resolve, 2000)) // 2 second delay
};

export const iframeHeight = "800px"

export const description = "A sidebar with a header and a search form."


export default async function Page() {
  await fakeFetch();
  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-8">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Flyball Timing Dashboard</h1>
              <RaceResults rows={sampleRows} />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}

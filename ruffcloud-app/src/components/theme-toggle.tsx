"use client"

import * as React from "react"
import { MoonIcon, SunIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

const STORAGE_KEY = "ruff-theme"

// Runs in <head> before paint so the saved theme applies without a flash.
// Defaults to dark (matches the firmware GUI) unless the OS asks for light.
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(!t){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.classList.toggle("dark",t==="dark")}catch(e){document.documentElement.classList.add("dark")}})()`

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  return () => observer.disconnect()
}

export function ThemeToggle() {
  // null on the server, so the first render doesn't guess the theme
  const dark = React.useSyncExternalStore<boolean | null>(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => null
  )

  function toggle() {
    const next = !dark
    document.documentElement.classList.toggle("dark", next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light")
    } catch {}
  }

  return (
    <Button variant="outline" onClick={toggle} className="h-10 gap-2 px-4">
      {dark === false ? <MoonIcon /> : <SunIcon />}
      {/* Label names the mode you switch to, like the firmware dashboard */}
      <span>{dark === false ? "Dark mode" : "Light mode"}</span>
    </Button>
  )
}

// Name: Add Espanso Trigger
// Description: Adds a new Espanso trigger using selected text as default and prompts to confirm replacement.
// Author: okeefj22
// GitHub:

import "@johnlindquist/kit"
import YAML from "yaml"

type EspansoDoc = {
  matches?: {
    trigger: string
    replace: string
  }[]
}

const findEspansoDir = async (): Promise<string> => {
  try {
    let configDir = await $`espanso path config`
    return configDir.stdio[1]
  } catch {
    const picked = await selectFolder("Select your espanso config directory (contains a 'match' folder)")
    return picked
  }
}

const espansoDir = await findEspansoDir()
const matchDir = path.join(espansoDir, "match")
await ensureDir(matchDir)

const filePath = path.join(matchDir, "kit.yml")
let doc: EspansoDoc = { matches: [] }

try {
  if (await pathExists(filePath)) {
    const existing = await readFile(filePath, "utf8")
    const parsed = YAML.parse(existing) as EspansoDoc
    if (parsed && typeof parsed === "object") {
      doc = { matches: Array.isArray(parsed.matches) ? parsed.matches : [] }
    }
  }
} catch {
  doc = { matches: [] }
}

const selected = (await getSelectedText())?.trim() || ""

const [trigger, replacement] = await fields([
  { label: "Trigger", value: selected },
  { label: "Replacement", value: selected, placeholder: "Enter replacement text" },
])

if (!trigger || !replacement) {
  await notify("Trigger and Replacement are required.")
  exit()
}

const existingIndex = doc.matches!.findIndex(m => m.trigger === trigger)
if (existingIndex >= 0) {
  // Update existing match
  doc.matches![existingIndex].replace = replacement
} else {
  // Add new match
  doc.matches!.push({ trigger, replace: replacement })
}

const yaml = YAML.stringify({ matches: doc.matches })
await writeFile(filePath, yaml)

toast(`Added to espanso: ${trigger} → ${replacement}`, { autoClose: 3000 })

try {
  await $`espanso restart`
} catch {
  // espanso may not be in PATH or running; ignore
}
# KickLab project guidance

One device-local player avatar ID represents the same recognizable person in Fight, Race, and Kick. Each lab gives that player activity-appropriate clothing while preserving face, complexion, hair, build, identity color, and visual style. Fight uses age-appropriate protective training gear, Race uses driver equipment, and Kick uses a soccer kit. Keep Coaches separate from player identity. Add new wardrobe art as local assets with provenance; keep existing avatar IDs and profile storage compatible.

Selectable parts, categories, and actions need meaningful, visually distinct icons with accessible text or tooltips. Keep a visible label whenever an icon could be ambiguous; do not rely on icon-only controls or color alone to explain a choice.

Race cockpit changes must keep the same information architecture and interactions across phone, tablet, laptop, and desktop. Use the compact event map, contextual Coach notices, one wrench for tools, and compact icon-first controller selection at every width. Do not reintroduce persistent gameplay banners, a fixed right rail, or block-style control choosers on desktop.

Every expanded Race tools tile must show its current selection or live value from the canonical game, profile, or Garage state. Refresh these readouts after the player changes a value and when the tools reopen or local profile state restores; keep full values in accessible names when the compact tile clips the visible text.

Race controller labels and live readouts must stay legible at narrow widths. Keep every visible control, including the full D-pad and its text, inside its visual and touch target region with bottom safe-area clearance.

Keep Race telemetry and tuning-variable selection in the cockpit or wrench Math detail. The floating controller may show contextual actions such as Shift or Lock band, but must not reserve an empty selector row or show unlabeled paging arrows.

Race results must separate Coach guidance into one evidence-backed "What worked" observation and one specific "Next focus" observation, each in its own visual theme. The actionable card opens a deeper review with the same two themes, metrics, events, and plan. A visual replay preview must use bounded, local frames from the canonical 3D race presentation; when 3D frames are unavailable, offer a text Replay action without showing a schematic substitute.

Race safe exit points use the visible label "Save & Exit" and preserve the active device-local profile, selected setup, and already-earned progress before returning home. An incomplete run must not award a result or resume on re-entry. In the pause menu, Resume and Save & Exit have equal dimensions, typography, and accessible touch targets at every width.

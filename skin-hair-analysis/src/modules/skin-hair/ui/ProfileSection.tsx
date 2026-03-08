import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CONCERN_OPTIONS, PRODUCT_CATEGORIES, SCALP_TYPES, SKIN_TYPES } from "../constants";
import type { ProfilePayload } from "./types";

interface ProfileSectionProps {
  profile: ProfilePayload;
  onChange: (next: ProfilePayload) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  defaultOpen?: boolean;
}

function toggleValue(values: string[], value: string): string[] {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }
  return [...values, value];
}

function commaValue(values?: string[]): string {
  return (values || []).join(", ");
}

function parseCommaValue(value: string): string[] {
  return [...new Set(value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))];
}

export function ProfileSection({ profile, onChange, onSave, saving, defaultOpen = false }: ProfileSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section id="profile" className="module-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="module-title">Profile</h3>
          <p className="module-subtitle">Define skin/scalp baseline, concerns, allergies, and ingredient sensitivities.</p>
        </div>

        <button type="button" className="btn-secondary" onClick={() => setIsOpen((prev) => !prev)}>
          <span>{isOpen ? "Hide" : "Open"}</span>
          <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {!isOpen ? null : (
        <>
          <div className="flex justify-end mt-5">
            <button className="btn-primary" type="button" onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save profile"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <div>
              <label className="text-sm text-doom-muted">Skin type</label>
              <select
                className="input-field mt-1"
                value={profile.skin_type}
                onChange={(event) => onChange({ ...profile, skin_type: event.target.value as ProfilePayload["skin_type"] })}
              >
                {SKIN_TYPES.map((skinType) => (
                  <option key={skinType} value={skinType}>
                    {skinType}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-doom-muted">Scalp type</label>
              <select
                className="input-field mt-1"
                value={profile.scalp_type}
                onChange={(event) => onChange({ ...profile, scalp_type: event.target.value as ProfilePayload["scalp_type"] })}
              >
                {SCALP_TYPES.map((scalpType) => (
                  <option key={scalpType} value={scalpType}>
                    {scalpType}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm text-doom-muted mb-2">Concerns</p>
            <div className="flex flex-wrap gap-2">
              {CONCERN_OPTIONS.map((concern) => {
                const active = profile.concerns.includes(concern);
                return (
                  <button
                    type="button"
                    key={concern}
                    onClick={() => onChange({ ...profile, concerns: toggleValue(profile.concerns, concern) })}
                    className={`chip transition ${active ? "bg-doom-primary/20 border-doom-primary text-doom-primary" : ""}`}
                  >
                    {concern}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <div>
              <label className="text-sm text-doom-muted">Allergies (comma separated)</label>
              <input
                className="input-field mt-1"
                value={commaValue(profile.allergies)}
                onChange={(event) => onChange({ ...profile, allergies: parseCommaValue(event.target.value) })}
                placeholder="lanolin, coconut oil"
              />
            </div>

            <div>
              <label className="text-sm text-doom-muted">Ingredient sensitivities (comma separated)</label>
              <input
                className="input-field mt-1"
                value={commaValue(profile.sensitivities)}
                onChange={(event) => onChange({ ...profile, sensitivities: parseCommaValue(event.target.value) })}
                placeholder="fragrance, sulfates, parabens"
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm text-doom-muted">Preferred categories (optional)</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {PRODUCT_CATEGORIES.map((category) => {
                const current = profile.preferred_categories || [];
                const active = current.includes(category);
                return (
                  <button
                    type="button"
                    key={category}
                    onClick={() =>
                      onChange({
                        ...profile,
                        preferred_categories: toggleValue(current, category),
                      })
                    }
                    className={`chip transition ${active ? "bg-doom-accent/20 border-doom-accent text-doom-accent" : ""}`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
